// GET /api/songs — отдаёт переводчиков с их песнями (публичный)
const { sql } = require('./_db');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }

    try {
        const translators = await sql`
            SELECT id, name, sort_order
            FROM translators
            ORDER BY sort_order, name
        `;

        const songs = await sql`
            SELECT id, title, artist, status, url, translation, translator_id
            FROM songs
            ORDER BY id
        `;

        const songsByTranslator = {};
        songs.forEach(s => {
            if (!songsByTranslator[s.translator_id]) {
                songsByTranslator[s.translator_id] = [];
            }
            songsByTranslator[s.translator_id].push(s);
        });

        const data = {
            translators: translators.map(t => ({
                id: t.id,
                name: t.name,
                songs: songsByTranslator[t.id] || []
            }))
        };

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        return res.json(data);
    } catch (e) {
        console.error('[songs] Ошибка:', e);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};
