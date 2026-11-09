// /api/admin/user — CRUD пользователей админки
const { sql } = require('../_db');
const { requireAuth } = require('../_auth'); // Используем requireAuth для гибкости
const { hashPassword } = require('../_password');

async function handler(req, res) {
    try {
        // GET — список пользователей
        if (req.method === 'GET') {
            // 🔒 Доп. защита: раскомментируй строку ниже, если список юзеров должны видеть ТОЛЬКО админы
            // if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только админ может просматривать список' });

            const users = await sql`
                SELECT id, username, role, created_at 
                FROM users 
                ORDER BY id
            `;
            return res.json(users);
        }

        // POST — создать пользователя
        if (req.method === 'POST') {
            // 🔒 Создание новых пользователей — только для админов
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Только администратор может создавать пользователей' });
            }

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

            // 🔒 ШАГ 1: Узнаём, кого именно пытаются изменить
            const targetUsers = await sql`SELECT id, username, role FROM users WHERE id = ${id}`;
            const targetUser = targetUsers[0];

            if (!targetUser) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // 🔒 ШАГ 2: АБСОЛЮТНЫЙ ЗАПРЕТ редактору трогать админа
            if (req.user.role === 'editor' && targetUser.role === 'admin') {
                return res.status(403).json({ error: 'Редактор не может изменять данные администратора' });
            }

            // 🔒 ШАГ 3: Админ не может случайно снять с себя права админа (защита от "выстрела в ногу")
            // (Сравниваем req.user.sub из токена с id целевого пользователя)
            if (req.user.role === 'admin' && targetUser.role === 'admin' && req.user.sub == id) {
                if (role !== undefined && role !== 'admin') {
                    return res.status(400).json({ error: 'Администратор не может снять с себя права админа' });
                }
            }

            // Формируем безопасный запрос на обновление
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

            // 🔒 ШАГ 1: Проверяем, кого удаляем
            const targetUsers = await sql`SELECT id, role FROM users WHERE id = ${id}`;
            const targetUser = targetUsers[0];

            if (!targetUser) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // 🔒 ШАГ 2: Нельзя удалить самого себя (сравниваем с req.user.sub из токена)
            if (req.user.sub == id) {
                return res.status(400).json({ error: 'Нельзя удалить самого себя' });
            }

            // 🔒 ШАГ 3: Удаление — привилегия только админа
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Только администратор может удалять пользователей' });
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

// Экспортируем с базовой проверкой авторизации. Вся логика прав теперь внутри handler!
module.exports = requireAuth(handler);