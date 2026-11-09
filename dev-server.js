// Локальный dev-сервер, имитирующий Vercel Functions
// Запуск: node dev-server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Загрузка .env
try {
    const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    env.split('\n').forEach(line => {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
} catch (e) {
    console.log('[dev] .env не найден — использую переменные окружения системы');
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
};

// Маршруты API
const API_ROUTES = {
    '/api/songs': require('./api/songs.js'),
    '/api/login': require('./api/login.js'),
    '/api/admin/song': require('./api/admin/song.js'),
    '/api/admin/translator': require('./api/admin/translator.js')
};

const server = http.createServer((req, res) => {
    // Разбор URL и query
    const url = new URL(req.url, `http://${req.headers.host}`);
    req.query = Object.fromEntries(url.searchParams);

    // Парсинг тела для POST/PUT
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        if (body) {
            try { req.body = JSON.parse(body); } catch (e) { req.body = {}; }
        } else {
            req.body = {};
        }

        // API маршруты
        const handler = API_ROUTES[url.pathname];
        if (handler) {
            res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            };
            res.status = (code) => { res.statusCode = code; return res; };
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                return res.end();
            }
            return handler(req, res);
        }

        // Статические файлы
        let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
        const ext = path.extname(filePath).toLowerCase();
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.statusCode = 404;
            res.end('404 Not Found');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[dev] Сервер запущен: http://localhost:${PORT}`);
    console.log(`[dev] Сайт: http://localhost:${PORT}/`);
    console.log(`[dev] Админка: http://localhost:${PORT}/admin.html`);
    console.log(`[dev] API: http://localhost:${PORT}/api/songs`);
});
