#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const APPS_DIR = join(ROOT_DIR, 'content', 'docs', 'apps');
const GITMODULES_FILE = join(ROOT_DIR, '.gitmodules');

console.log('[sync-submodules] Starting documentation submodule synchronization...');

// 1. Sync & update Git submodules if .gitmodules exists and has content
if (existsSync(GITMODULES_FILE)) {
  const gitmodulesContent = readFileSync(GITMODULES_FILE, 'utf8').trim();
  if (gitmodulesContent.length > 0) {
    try {
      console.log('[sync-submodules] Synchronizing Git submodules...');
      execSync('git submodule sync --recursive', { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync('git submodule update --init --remote --recursive', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('[sync-submodules] Git submodules updated successfully.');
    } catch (err) {
      console.warn('[sync-submodules] Warning: Git submodule command failed or incomplete:', err.message);
    }
  } else {
    console.log('[sync-submodules] .gitmodules is empty. Skipping submodule update.');
  }
} else {
  console.log('[sync-submodules] No .gitmodules found. Skipping Git submodule update.');
}

// 2. Scan content/docs/apps/*/ for missing frontmatter titles
function getMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
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

if (existsSync(APPS_DIR)) {
  const mdFiles = getMarkdownFiles(APPS_DIR);
  console.log(`[sync-submodules] Checking frontmatter for ${mdFiles.length} markdown file(s) in apps directory...`);

  for (const filePath of mdFiles) {
    const relPath = relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const content = readFileSync(filePath, 'utf8');

    const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const hasTitle = /^\s*title\s*:\s*.+$/m.test(yaml);
      if (!hasTitle) {
        console.warn(`[sync-submodules] Warning: ${relPath} has frontmatter but is missing a 'title' field.`);
        const fallbackTitle = extractFallbackTitle(content, filePath);
        const updatedFrontmatter = `title: "${fallbackTitle}"\n${yaml}`;
        const updatedContent = content.replace(/^---\s*\r?\n([\s\S]*?)\r?\n---/, `---\n${updatedFrontmatter}\n---`);
        writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`[sync-submodules] Added fallback title "${fallbackTitle}" to ${relPath}`);
      }
    } else {
      console.warn(`[sync-submodules] Warning: ${relPath} is missing YAML frontmatter entirely.`);
      const fallbackTitle = extractFallbackTitle(content, filePath);
      const injected = `---\ntitle: "${fallbackTitle}"\n---\n\n${content}`;
      writeFileSync(filePath, injected, 'utf8');
      console.log(`[sync-submodules] Injected YAML frontmatter with title "${fallbackTitle}" into ${relPath}`);
    }
  }
}

function extractFallbackTitle(content, filePath) {
  // First check for a markdown level-1 heading (# Title)
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim().replace(/["\\]/g, '');
  }

  // Fallback to formatted filename
  const rawName = basename(filePath, extname(filePath));
  if (rawName.toLowerCase() === 'index' || rawName.toLowerCase() === 'readme') {
    const parentDir = basename(resolve(filePath, '..'));
    return formatName(parentDir);
  }
  return formatName(rawName);
}

function formatName(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

console.log('[sync-submodules] Submodule synchronization and validation completed successfully.');
