import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const ROOT_DIR = resolve(__dirname, '../..');
export const CONTENT_DOCS_DIR = join(ROOT_DIR, 'content', 'docs');
export const APPS_DOCS_DIR = join(CONTENT_DOCS_DIR, 'apps');
export const BINDER_MANIFEST_PATH = join(ROOT_DIR, 'binder-manifest.json');
export const BINDER_INDEX_PATH = join(ROOT_DIR, 'public', 'binder-index.json');

/**
 * Recursively collect all .md and .mdx files in deterministic sorted order.
 */
export function getMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  );

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getMarkdownFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.md' || ext === '.mdx') {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Normalize line endings to LF before hashing so Windows and Linux CI produce identical digests.
 */
export function computeSha256(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function formatName(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function extractFallbackTitle(content, filePath) {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim().replace(/["\\]/g, '');
  }

  const rawName = basename(filePath, extname(filePath));
  if (rawName.toLowerCase() === 'index' || rawName.toLowerCase() === 'readme') {
    const parentDir = basename(resolve(filePath, '..'));
    return formatName(parentDir);
  }
  return formatName(rawName);
}

/**
 * Parse YAML frontmatter title/description from a markdown document.
 */
export function parseFrontmatter(content, filePath) {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  let title = '';
  let description = '';

  if (match) {
    const yaml = match[1];
    const titleMatch = yaml.match(/^\s*title\s*:\s*["']?([^"'\r\n]+)["']?/m);
    if (titleMatch) title = titleMatch[1].trim();
    const descMatch = yaml.match(/^\s*description\s*:\s*["']?([^"'\r\n]+)["']?/m);
    if (descMatch) description = descMatch[1].trim();
  }

  if (!title && filePath) {
    title = extractFallbackTitle(content, filePath);
  }

  return {
    hasFrontmatter: Boolean(match),
    yaml: match ? match[1] : '',
    title,
    description,
  };
}

/**
 * Convert a path relative to content/docs (POSIX) into a Fumadocs /docs URL slug.
 */
export function filePathToDocSlug(relFromContentDocs) {
  const posix = relFromContentDocs.replace(/\\/g, '/').replace(/^\/+/, '');
  const withoutExt = posix.replace(/\.(mdx|md)$/i, '');

  if (withoutExt === 'index') {
    return '/docs';
  }
  if (withoutExt.endsWith('/index')) {
    return `/docs/${withoutExt.slice(0, -'/index'.length)}`;
  }
  return `/docs/${withoutExt}`;
}

function runGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Resolve the latest git commit metadata for a documentation file,
 * automatically delegating to submodule git history under content/docs/apps/<app>.
 */
export function getGitFileMeta(filePath, rootDir = ROOT_DIR) {
  const relFromContent = relative(join(rootDir, 'content', 'docs'), filePath).replace(/\\/g, '/');
  let gitCwd = rootDir;
  let gitRelPath = relative(rootDir, filePath).replace(/\\/g, '/');
  let sourceRepo = 'sunshade-docs';

  if (relFromContent.startsWith('apps/')) {
    const parts = relFromContent.split('/');
    if (parts.length >= 2) {
      const appSlug = parts[1];
      const appDir = join(rootDir, 'content', 'docs', 'apps', appSlug);
      if (existsSync(join(appDir, '.git'))) {
        gitCwd = appDir;
        gitRelPath = parts.slice(2).join('/');
        sourceRepo = appSlug;
      } else {
        sourceRepo = appSlug;
      }
    }
  }

  let raw = runGit(['log', '-1', '--format=%H|%cI', '--', gitRelPath], gitCwd);
  if (!raw) {
    raw = runGit(['log', '-1', '--format=%H|%cI'], gitCwd);
  }

  const [commit = '', committedAt = ''] = raw.split('|');
  const resolvedCommit = commit || 'uncommitted';
  return {
    commit: resolvedCommit,
    shortCommit: resolvedCommit === 'uncommitted' ? 'local' : resolvedCommit.slice(0, 7),
    committedAt: committedAt || new Date().toISOString(),
    sourceRepo,
  };
}

export function getPortalGitMeta(rootDir = ROOT_DIR) {
  const portalCommit = runGit(['rev-parse', 'HEAD'], rootDir) || 'uncommitted';
  const remoteUrl = runGit(['remote', 'get-url', 'origin'], rootDir);
  let portalRepo = 'tympollack/sunshade-docs';
  if (remoteUrl) {
    const match = remoteUrl.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
    if (match) portalRepo = match[1];
  }

  return {
    portalCommit,
    shortPortalCommit: portalCommit === 'uncommitted' ? 'local' : portalCommit.slice(0, 7),
    portalRepo,
  };
}

export function readBinderManifest(manifestPath = BINDER_MANIFEST_PATH) {
  if (!existsSync(manifestPath)) {
    return {
      version: 1,
      lastPrintedAt: null,
      lastPrintedCommit: null,
      printedBy: null,
      documents: {},
    };
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function writeBinderManifest(manifest, manifestPath = BINDER_MANIFEST_PATH) {
  const sortedDocs = {};
  for (const key of Object.keys(manifest.documents || {}).sort((a, b) => a.localeCompare(b, 'en'))) {
    sortedDocs[key] = manifest.documents[key];
  }
  const normalized = {
    version: manifest.version ?? 1,
    lastPrintedAt: manifest.lastPrintedAt ?? null,
    lastPrintedCommit: manifest.lastPrintedCommit ?? null,
    printedBy: manifest.printedBy ?? null,
    documents: sortedDocs,
  };
  writeFileSync(manifestPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

/**
 * Scan all documentation files under contentDir and build deterministic metadata records.
 */
export function scanDocumentationRecords(rootDir = ROOT_DIR) {
  const docsDir = join(rootDir, 'content', 'docs');
  const files = getMarkdownFiles(docsDir);
  return files.map((filePath) => {
    const relPath = relative(docsDir, filePath).replace(/\\/g, '/');
    const raw = readFileSync(filePath, 'utf8');
    const sha256 = computeSha256(raw);
    const { title, description } = parseFrontmatter(raw, filePath);
    const slug = filePathToDocSlug(relPath);
    const gitMeta = getGitFileMeta(filePath, rootDir);
    return {
      filePath: relPath,
      slug,
      title,
      description,
      sha256,
      shortHash: sha256.slice(0, 12),
      ...gitMeta,
    };
  });
}
