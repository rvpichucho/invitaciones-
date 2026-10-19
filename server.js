const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Cache-Control': 'no-cache' }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad request');
  }

  if (urlPath === '/') urlPath = '/index.html';

  // Normaliza y evita salir del directorio raíz
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA-friendly: cualquier ruta desconocida regresa la invitación
      const fallback = path.join(ROOT, 'index.html');
      fs.readFile(fallback, (e2, data) => {
        if (e2) return send(res, 404, 'Not found');
        send(res, 200, data, {
          'Content-Type': MIME['.html'],
          'Cache-Control': 'public, max-age=0, must-revalidate'
        });
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isAsset = /[\\/]assets[\\/]/.test(filePath);
    const cache = isAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cache
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => { try { res.destroy(); } catch (e) {} });
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Invitación disponible en el puerto ' + PORT);
});
