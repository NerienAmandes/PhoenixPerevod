// POST /api/login — вход по логину + паролю (таблица users)
const jwt = require('jsonwebtoken');
const { sql } = require('./_db');
const { verifyPassword } = require('./_password');

const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    try {
        const users = await sql`
            SELECT id, username, password_hash, role
            FROM users
            WHERE username = ${username}
            LIMIT 1
        `;
        const user = users[0];
        if (!user || !verifyPassword(password, user.password_hash)) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        const token = signToken({ sub: user.id, username: user.username, role: user.role });
        return res.json({ token, username: user.username, role: user.role });
    } catch (e) {
        console.error('[login] Ошибка запроса пользователя:', e);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};
