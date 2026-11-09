// Поиск дубликатов песни "Hey chat!" в БД
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
env.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
});

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
    try {
        // Ищем все песни с похожим названием
        const matches = await sql`
            SELECT id, title, artist, translator_id
            FROM songs
            WHERE LOWER(title) LIKE '%chat%'
               OR LOWER(title) LIKE '%хэй%'
               OR LOWER(title) LIKE '%hey%'
            ORDER BY id
        `;
        console.log('Песни с "chat/хэй/hey" в названии:');
        matches.forEach(r => console.log(`  id=${r.id} | title="${r.title}" | artist="${r.artist}" | translator_id=${r.translator_id}`));

        // Ищем дубликаты по названию (без учёта регистра)
        const dups = await sql`
            SELECT LOWER(TRIM(title)) as norm_title, COUNT(*) as cnt, array_agg(id) as ids
            FROM songs
            GROUP BY LOWER(TRIM(title))
            HAVING COUNT(*) > 1
            ORDER BY cnt DESC
        `;
        console.log('\nДубликаты по названию:');
        dups.forEach(r => console.log(`  "${r.norm_title}" — ${r.cnt} шт, ids: [${r.ids.join(', ')}]`));

        process.exit(0);
    } catch (e) {
        console.error('Ошибка:', e.message);
        process.exit(1);
    }
})();
