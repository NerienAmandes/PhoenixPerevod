// Одноразовый скрипт: создаёт первого администратора в таблице users.
// Запуск:  node bootstrap-admin.js [логин] [пароль]
// Если логин/пароль не переданы — берёт логин "admin", пароль из ADMIN_PASSWORD.
const fs = require('fs');
const path = require('path');

// Загрузка .env
try {
    const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
} catch (e) {
    console.log('[bootstrap] .env не найден — использую переменные окружения');
}

const { sql } = require('./api/_db');
const { hashPassword } = require('./api/_password');

const username = process.argv[2] || 'admin';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'phoenix2024';

(async () => {
    try {
        // Создаём таблицу, если миграция ещё не запускалась
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id            serial PRIMARY KEY,
                username      text NOT NULL UNIQUE,
                password_hash text NOT NULL,
                role          text NOT NULL DEFAULT 'editor'
                              CHECK (role IN ('admin', 'editor')),
                created_at    timestamptz NOT NULL DEFAULT now()
            )
        `;

        // Проверяем, есть ли уже такой пользователь
        const existing = await sql`
            SELECT id FROM users WHERE username = ${username}
        `;

        if (existing.length > 0) {
            // Обновляем пароль и роль на admin
            const password_hash = hashPassword(password);
            await sql`
                UPDATE users
                SET password_hash = ${password_hash}, role = 'admin'
                WHERE username = ${username}
            `;
            console.log(`✅ Пользователь "${username}" уже существовал — пароль и роль обновлены.`);
        } else {
            const password_hash = hashPassword(password);
            await sql`
                INSERT INTO users (username, password_hash, role)
                VALUES (${username}, ${password_hash}, 'admin')
            `;
            console.log(`✅ Создан администратор:`);
        }

        console.log(`   👤 Логин:    ${username}`);
        console.log(`   🔑 Пароль:   ${password}`);
        console.log(`   🔗 Вход:     /admin.html`);
        console.log(`\nЗапомни эти данные! Пароль в базе хранится в захешированном виде.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
        process.exit(1);
    }
})();
