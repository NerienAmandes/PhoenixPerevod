// Генератор SQL-миграции из songs.js для Supabase (PostgreSQL)
// Использование: node generate-sql.js
const fs = require('fs');
const path = require('path');

const { translatorsData } = require('./songs.js');

// Доллар-квотирование строк: $phx$ ... $phx$ — не требует экранирования кавычек/слэшей
const TAG = '$phx$';
function q(str) {
    if (str == null) return 'NULL';
    const s = String(str);
    // На случай, если текст вдруг содержит сам тег — подстрахуемся сменой тега
    if (s.includes(TAG)) {
        const alt = '$phx2$';
        if (!s.includes(alt)) return alt + s + alt;
    }
    return TAG + s + TAG;
}

const out = [];

out.push('-- ============================================');
out.push('-- PhoenixPerevod: схема + начальные данные');
out.push('-- Источник: songs.js');
out.push('-- ============================================');
out.push('');
out.push('CREATE TABLE IF NOT EXISTS translators (');
out.push('  id          text PRIMARY KEY,');
out.push('  name        text NOT NULL,');
out.push('  sort_order  integer NOT NULL DEFAULT 0');
out.push(');');
out.push('');
out.push('CREATE TABLE IF NOT EXISTS songs (');
out.push('  id            integer PRIMARY KEY,');
out.push('  title         text NOT NULL,');
out.push('  artist        text,');
out.push('  status        text NOT NULL DEFAULT \'free\'');
out.push('                CHECK (status IN (\'free\',\'in_progress\',\'taken\',\'done\')),');
out.push('  url           text,');
out.push('  translation   text,');
out.push('  translator_id text REFERENCES translators(id) ON DELETE CASCADE,');
out.push('  created_at    timestamptz NOT NULL DEFAULT now()');
out.push(');');
out.push('');
out.push('CREATE INDEX IF NOT EXISTS idx_songs_translator ON songs(translator_id);');
out.push('CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);');
out.push('');
out.push('');
out.push('-- ----- Переводчики -----');
translatorsData.translators.forEach((t, i) => {
    out.push(`INSERT INTO translators (id, name, sort_order) VALUES (${q(t.id)}, ${q(t.name)}, ${i}) ON CONFLICT (id) DO NOTHING;`);
});

out.push('');
out.push('');
out.push('-- ----- Песни -----');
let totalSongs = 0;
translatorsData.translators.forEach(t => {
    t.songs.forEach(s => {
        totalSongs++;
        const url = s.url ? q(s.url) : 'NULL';
        const trans = s.translation ? q(s.translation) : 'NULL';
        out.push(
            `INSERT INTO songs (id, title, artist, status, url, translation, translator_id) ` +
            `VALUES (${s.id}, ${q(s.title)}, ${q(s.artist)}, '${s.status}', ${url}, ${trans}, ${q(t.id)}) ` +
            `ON CONFLICT (id) DO NOTHING;`
        );
    });
});

out.push('');
out.push(`-- Всего переводчиков: ${translatorsData.translators.length}, песен: ${totalSongs}`);

const dir = path.join(__dirname, 'supabase', 'migrations');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, '0001_init.sql');
fs.writeFileSync(file, out.join('\n'), 'utf8');

console.log(`OK -> ${file}`);
console.log(`Переводчиков: ${translatorsData.translators.length}, песен: ${totalSongs}`);
console.log(`Размер файла: ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
