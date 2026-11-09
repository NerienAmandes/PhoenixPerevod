// /api/admin/user — CRUD пользователей админки (только для админов)
const { sql } = require('../_db');
const { requireAdmin } = require('../_auth');
const { hashPassword } = require('../_password');

async function handler(req, res) {
    try {
        // GET — список пользователей (без хешей паролей)
        if (req.method === 'GET') {
            const users = await sql`
                SELECT id, username, role, created_at
                FROM users
                ORDER BY id
            `;
            return res.json(users);
        }

        // POST — создать пользователя
        if (req.method === 'POST') {
            const { username, password, role } = req.body || {};
            if (!username || !password) {
                return res.status(400).json({ error: 'Логин и пароль обязательны' });
            }
            const userRole = role === 'admin' ? 'admin' : 'editor';
            const password_hash = hashPassword(password);
            const [user] = await sql`
                INSERT INTO users (username, password_hash, role)
                VALUES (${username}, ${password_hash}, ${userRole})
                RETURNING id, username, role, created_at
            `;
            return res.json(user);
        }

        // PUT — обновить пользователя (логин, пароль, роль)
        if (req.method === 'PUT') {
            const { id, username, password, role } = req.body || {};
            if (!id) return res.status(400).json({ error: 'id обязателен' });

            const setClauses = [];
            const params = [];
            let idx = 1;

            if (username !== undefined) { setClauses.push(`username = $${idx++}`); params.push(username); }
            if (password !== undefined) { setClauses.push(`password_hash = $${idx++}`); params.push(hashPassword(password)); }
            if (role !== undefined) { setClauses.push(`role = $${idx++}`); params.push(role === 'admin' ? 'admin' : 'editor'); }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'Нет полей для обновления' });
            }

            params.push(id);
            const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, username, role, created_at`;
            const result = await sql(query, params);

            if (result.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
            return res.json(result[0]);
        }

        // DELETE — удалить пользователя
        if (req.method === 'DELETE') {
            const id = parseInt(req.query.id, 10);
            if (!id) return res.status(400).json({ error: 'id обязателен' });

            // Не даём удалить самого себя (по id из токена), если он админ — на всякий случай
            if (req.user && req.user.sub === id) {
                return res.status(400).json({ error: 'Нельзя удалить самого себя' });
            }

            const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
            if (result.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
            return res.json({ ok: true, deleted: result[0].id });
        }

        return res.status(405).json({ error: 'Метод не поддерживается' });
    } catch (e) {
        console.error('[admin/user] Ошибка:', e);
        if (e.code === '23505') {
            return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
        }
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
}

module.exports = requireAdmin(handler);
