import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const distPath = resolve(process.argv[2] || 'dist');
const port = parseInt(process.env.PORT || '3000', 10);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let filePath = join(distPath, urlPath);
  if (urlPath.endsWith('/')) {
    filePath = join(distPath, urlPath, 'index.html');
  }
  if (!existsSync(filePath)) {
    filePath = join(distPath, 'index.html');
  }

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
});

