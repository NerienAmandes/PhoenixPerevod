// /api/admin/translator — CRUD переводчиков (требует авторизации)
const { sql } = require('../_db');
const { requireAuth } = require('../_auth');

async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            const { id, name } = req.body || {};
            if (!id || !name) {
                return res.status(400).json({ error: 'id и имя обязательны' });
            }
            const [translator] = await sql`
                INSERT INTO translators (id, name, sort_order)
                VALUES (${id}, ${name}, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM translators))
                RETURNING *
            `;
            return res.json(translator);
        }

        if (req.method === 'PUT') {
            const { id, name, sort_order } = req.body || {};
            if (!id) {
                return res.status(400).json({ error: 'id обязателен' });
            }

            const setClauses = [];
            const params = [];
            let idx = 1;
            if (name !== undefined) { setClauses.push(`name = $${idx++}`); params.push(name); }
            if (sort_order !== undefined) { setClauses.push(`sort_order = $${idx++}`); params.push(sort_order); }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'Нет полей для обновления' });
            }

            params.push(id);
            const query = `UPDATE translators SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
            const result = await sql(query, params);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Переводчик не найден' });
            }
            return res.json(result[0]);
        }

        if (req.method === 'DELETE') {
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'id обязателен' });
            }
            const result = await sql`DELETE FROM translators WHERE id = ${id} RETURNING id`;
            if (result.length === 0) {
                return res.status(404).json({ error: 'Переводчик не найден' });
            }
            return res.json({ ok: true, deleted: result[0].id });
        }

        return res.status(405).json({ error: 'Метод не поддерживается' });
    } catch (e) {
        console.error('[admin/translator] Ошибка:', e);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
}

module.exports = requireAuth(handler);
