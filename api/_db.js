// Подключение к Neon (Postgres) для Vercel Functions
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

let sql;
if (DATABASE_URL) {
    sql = neon(DATABASE_URL);
} else {
    // Если DATABASE_URL не задана — отдаём функцию, которая объяснит ошибку
    sql = async () => {
        throw new Error('DATABASE_URL не задана в переменных окружения');
    };
}

module.exports = { sql };
