// Zero-dependency Node server for local dev or self-hosting (EC2, VPS, etc.).
// Serves the static site and POST /api/contact. Reads secrets from .env.
//   node server.js        → http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleContact } = require('./lib/contact');

loadEnv(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = new Set(['index.html', 'styles.css', 'script.js']);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 20000) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/contact') {
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }); return res.end(); }
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { body = null; }
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
    const { status, body: out } = await handleContact(body, ip);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(out));
  }

  // Only serve known public files and /assets — never .env, lib/, server.js.
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const safe = path.normalize(rel);
  const allowed = PUBLIC.has(safe) || (safe.startsWith('assets' + path.sep) && !safe.includes('..'));
  const file = path.join(ROOT, safe);
  if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
