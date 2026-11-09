// /api/admin/song — CRUD песен (требует авторизации)
const { sql } = require('../_db');
const { requireAuth } = require('../_auth');

async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            const { title, artist, status, url, translation, translator_id } = req.body || {};
            if (!title || !translator_id) {
                return res.status(400).json({ error: 'Название и переводчик обязательны' });
            }

            const nextIdRow = await sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM songs`;
            const nextId = nextIdRow[0].next_id;

            const [song] = await sql`
                INSERT INTO songs (id, title, artist, status, url, translation, translator_id)
                VALUES (${nextId}, ${title}, ${artist || null}, ${status || 'free'}, ${url || null}, ${translation || null}, ${translator_id})
                RETURNING *
            `;
            return res.json(song);
        }

        if (req.method === 'PUT') {
            const { id, title, artist, status, url, translation, translator_id } = req.body || {};
            if (!id) {
                return res.status(400).json({ error: 'id обязателен' });
            }

            const setClauses = [];
            const params = [];
            let idx = 1;

            const addField = (field, value) => {
                setClauses.push(`${field} = $${idx++}`);
                params.push(value);
            };

            if (title !== undefined) addField('title', title);
            if (artist !== undefined) addField('artist', artist || null);
            if (status !== undefined) addField('status', status);
            if (url !== undefined) addField('url', url || null);
            if (translation !== undefined) addField('translation', translation || null);
            if (translator_id !== undefined) addField('translator_id', translator_id);

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'Нет полей для обновления' });
            }

            params.push(id);
            const query = `UPDATE songs SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
            const result = await sql(query, params);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Песня не найдена' });
            }
            return res.json(result[0]);
        }

        if (req.method === 'DELETE') {
            const id = parseInt(req.query.id, 10);
            if (!id) {
                return res.status(400).json({ error: 'id обязателен' });
            }
            const result = await sql`DELETE FROM songs WHERE id = ${id} RETURNING id`;
            if (result.length === 0) {
                return res.status(404).json({ error: 'Песня не найдена' });
            }
            return res.json({ ok: true, deleted: result[0].id });
        }

        return res.status(405).json({ error: 'Метод не поддерживается' });
    } catch (e) {
        console.error('[admin/song] Ошибка:', e);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
}

module.exports = requireAuth(handler);
