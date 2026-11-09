// Проверка авторизации через JWT
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function getToken(req) {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

function verify(req, res) {
    const token = getToken(req);
    if (!token) {
        res.status(401).json({ error: 'Требуется авторизация' });
        return null;
    }
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        res.status(401).json({ error: 'Неверный или истёкший токен' });
        return null;
    }
}

// Доступ для любого авторизованного пользователя
function requireAuth(handler) {
    return (req, res) => {
        const payload = verify(req, res);
        if (!payload) return;
        req.user = payload;
        return handler(req, res);
    };
}

// Доступ только для админов
function requireAdmin(handler) {
    return (req, res) => {
        const payload = verify(req, res);
        if (!payload) return;
        if (payload.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        req.user = payload;
        return handler(req, res);
    };
}

module.exports = { requireAuth, requireAdmin, getToken };
