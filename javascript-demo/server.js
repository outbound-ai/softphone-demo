// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3030;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.d.ts': 'application/typescript'
};

const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Get the file path - check different directories in order
  let filePath;

  // 1) Prefer production build output (dist) if present
  filePath = path.join(__dirname, 'dist', pathname);
  if (!fs.existsSync(filePath) && pathname === '/index.html') {
    // Explicitly fall back to dist/index.html for root requests
    const distIndex = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distIndex)) {
      filePath = distIndex;
    }
  }

  // 2) Check public directory (e.g., audio worklets)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', pathname);
  }

  // 3) Check project root (source files - for dev convenience)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, pathname);
  }

  // 4) Finally, check node_modules
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'node_modules', pathname);
  }

  // Get file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end('File not found');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${__dirname}`);
  console.log(`Serving node_modules for package access`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('To stop the server, press Ctrl+C');
});