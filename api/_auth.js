// Проверка авторизации администратора через JWT
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function getToken(req) {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

function requireAuth(handler) {
    return (req, res) => {
        const token = getToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
            return handler(req, res);
        } catch (e) {
            return res.status(401).json({ error: 'Неверный или истёкший токен' });
        }
    };
}

module.exports = { requireAuth, getToken };
