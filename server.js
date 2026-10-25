const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'siteData.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // --- API ROUTES ---
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const { username, password } = await parseBody(req);
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      const adminCreds = data.admin || { username: 'anup', password: 'anup123' };

      if (username === adminCreds.username && password === adminCreds.password) {
        const token = 'cwa_' + Buffer.from(`${username}_${Date.now()}`).toString('base64');
        return sendJSON(res, 200, { success: true, token, username });
      } else {
        return sendJSON(res, 401, { success: false, error: 'Invalid username or password' });
      }
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: 'Authentication error' });
    }
  }

  if (pathname === '/api/admin/change-credentials' && req.method === 'POST') {
    try {
      const { oldPassword, newUsername, newPassword } = await parseBody(req);
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      const adminCreds = data.admin || { username: 'anup', password: 'anup123' };

      if (oldPassword !== adminCreds.password) {
        return sendJSON(res, 400, { success: false, error: 'Current password is incorrect' });
      }

      data.admin = {
        username: newUsername || adminCreds.username,
        password: newPassword || adminCreds.password
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return sendJSON(res, 200, { success: true, message: 'Admin credentials updated successfully!' });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: 'Failed to update credentials' });
    }
  }

  if (pathname === '/api/site-data' && req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      // Never expose admin password in public API
      const safeData = { ...data };
      if (safeData.admin) {
        safeData.admin = { username: safeData.admin.username };
      }
      return sendJSON(res, 200, safeData);
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to read site data' });
    }
  }

  if (pathname === '/api/site-data' && req.method === 'POST') {
    try {
      const newContent = await parseBody(req);
      if (!newContent || typeof newContent !== 'object') {
        return sendJSON(res, 400, { error: 'Invalid data format' });
      }
      // Preserve existing admin password if not provided
      const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (!newContent.admin || !newContent.admin.password) {
        newContent.admin = existing.admin || { username: 'anup', password: 'anup123' };
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(newContent, null, 2), 'utf-8');
      return sendJSON(res, 200, { success: true, message: 'Content updated successfully!', data: newContent });
    } catch (err) {
      console.error('Error updating site data:', err);
      return sendJSON(res, 500, { error: 'Failed to save site data: ' + err.message });
    }
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { dataUrl, filename = 'image.png' } = body;
      if (!dataUrl || !dataUrl.includes(',')) {
        return sendJSON(res, 400, { error: 'Invalid data URL' });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return sendJSON(res, 400, { error: 'Invalid base64 image format' });
      }

      const ext = path.extname(filename) || '.png';
      const cleanBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueName = `${cleanBase}_${Date.now()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${uniqueName}`;
      return sendJSON(res, 200, { success: true, url: fileUrl, filename: uniqueName });
    } catch (err) {
      console.error('Upload error:', err);
      return sendJSON(res, 500, { error: 'Upload failed: ' + err.message });
    }
  }

  if (pathname === '/api/messages' && req.method === 'GET') {
    try {
      const messages = fs.existsSync(MESSAGES_FILE) ? JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8')) : [];
      return sendJSON(res, 200, messages);
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to read messages' });
    }
  }

  if (pathname === '/api/messages' && req.method === 'POST') {
    try {
      const msg = await parseBody(req);
      const messages = fs.existsSync(MESSAGES_FILE) ? JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8')) : [];
      const newEntry = {
        id: 'msg_' + Date.now(),
        name: msg.name || 'Anonymous',
        email: msg.email || '',
        subject: msg.subject || 'Portfolio Inquiry',
        message: msg.message || '',
        date: new Date().toISOString()
      };
      messages.unshift(newEntry);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
      return sendJSON(res, 200, { success: true, message: 'Message sent successfully!' });
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to save message' });
    }
  }

  // --- STATIC FILE SERVING ---
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/admin') {
    pathname = '/admin.html';
  }

  let filePath = path.join(PUBLIC_DIR, pathname);

  // Security: prevent path traversal outside PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for HTML routing if not found
      if (!path.extname(pathname)) {
        const htmlFallback = filePath + '.html';
        if (fs.existsSync(htmlFallback)) {
          filePath = htmlFallback;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end('<h1>404 Not Found</h1><p><a href="/">Return to CodeWithAnup</a></p>');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 File Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CodeWithAnup is running successfully!`);
  console.log(`🌐 Portfolio Website: http://localhost:${PORT}`);
  console.log(`🛠️ Admin Dashboard:  http://localhost:${PORT}/admin`);
  console.log(`======================================================\n`);
});
