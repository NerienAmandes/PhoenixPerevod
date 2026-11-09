// POST /api/login — проверка пароля, выдача JWT
const jwt = require('jsonwebtoken');

const crypto = require('crypto');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// Безопасное сравнение строк (защита от timing-атак)
function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }

    const { password } = req.body || {};

    if (!ADMIN_PASSWORD) {
        console.error('[login] ADMIN_PASSWORD не задана в env');
        return res.status(500).json({ error: 'Сервер не настроен' });
    }

    if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
        return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign(
        { role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return res.json({ token });
};
