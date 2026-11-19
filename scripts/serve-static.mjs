#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR } from './lib/docs-utils.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

export function getContentType(filePath, requestPath = '') {
  if (requestPath === '/api/search') {
    return 'application/json; charset=utf-8';
  }
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function resolveStaticFile(outDir, rawPathname) {
  const root = resolve(outDir);
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname || '/');
  } catch {
    return null;
  }

  const normalizedPath = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const candidates = [];

  if (!normalizedPath) {
    candidates.push(resolve(root, 'index.html'));
  } else {
    const cleanRel = normalizedPath.replace(/\/+$/, '');
    candidates.push(resolve(root, cleanRel));
    candidates.push(resolve(root, `${cleanRel}.html`));
    candidates.push(resolve(root, cleanRel, 'index.html'));
  }

  for (const candidate of candidates) {
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
      continue;
    }
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

export function startStaticServer({
  outDir = join(ROOT_DIR, 'out'),
  port = Number(process.env.PORT || 3000),
  host = process.env.HOST || '127.0.0.1',
} = {}) {
  if (!existsSync(outDir)) {
    throw new Error(`Static export directory not found at ${outDir}. Run "npm run build" first.`);
  }

  const server = createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const filePath = resolveStaticFile(outDir, reqUrl.pathname);

    if (!filePath) {
      const notFoundPage = resolve(outDir, '404.html');
      if (existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        createReadStream(notFoundPage).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found\n');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath, reqUrl.pathname) });
    createReadStream(filePath).pipe(res);
  });

  return server.listen(port, host);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = startStaticServer({ port, host });
  server.on('listening', () => {
    console.log(`[start] Serving static export out/ at http://${host}:${port}`);
  });
}
