// Хеширование и проверка паролей через встроенный crypto.scrypt
// Без внешних зависимостей. Храним в формате "saltBase64:hashBase64".
const crypto = require('crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;
const SALT_LEN = 16;

function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LEN);
    const hash = crypto.scryptSync(String(password), salt, KEY_LEN, SCRYPT_PARAMS);
    return salt.toString('base64') + ':' + hash.toString('base64');
}

function verifyPassword(password, stored) {
    try {
        const parts = String(stored).split(':');
        if (parts.length !== 2) return false;
        const salt = Buffer.from(parts[0], 'base64');
        const expected = Buffer.from(parts[1], 'base64');
        const actual = crypto.scryptSync(String(password), salt, KEY_LEN, SCRYPT_PARAMS);
        if (actual.length !== expected.length) return false;
        return crypto.timingSafeEqual(actual, expected);
    } catch (e) {
        return false;
    }
}

module.exports = { hashPassword, verifyPassword };
