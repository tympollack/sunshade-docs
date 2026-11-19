#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  APPS_DOCS_DIR,
  ROOT_DIR,
  extractFallbackTitle,
  getMarkdownFiles,
} from './lib/docs-utils.mjs';

const GITMODULES_FILE = join(ROOT_DIR, '.gitmodules');
const strictMode = process.argv.includes('--strict') || process.env.CI === 'true';

console.log('[sync-submodules] Starting documentation submodule synchronization...');

// 1. Configure private submodule authentication in CI if SUBMODULES_PAT is provided
const submodulesPat = process.env.SUBMODULES_PAT || process.env.GH_SUBMODULE_TOKEN || '';
if (submodulesPat) {
  try {
    const authHeader = Buffer.from(`x-access-token:${submodulesPat}`).toString('base64');
    execSync(
      `git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic ${authHeader}"`,
      { cwd: ROOT_DIR, stdio: 'ignore' }
    );
    console.log('[sync-submodules] Configured GitHub token credential header for private submodules.');
  } catch (err) {
    console.warn('[sync-submodules] Warning: Could not configure submodule credential header:', err.message);
  }
}

// 2. Sync & update Git submodules if .gitmodules exists and has content
if (existsSync(GITMODULES_FILE)) {
  const gitmodulesContent = readFileSync(GITMODULES_FILE, 'utf8').trim();
  if (gitmodulesContent.length > 0) {
    try {
      console.log('[sync-submodules] Synchronizing Git submodules...');
      execSync('git submodule sync --recursive', { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync('git submodule update --init --remote --recursive', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('[sync-submodules] Git submodules updated successfully.');
    } catch (err) {
      if (strictMode) {
        console.error('[sync-submodules] Error: Git submodule synchronization failed in strict mode:', err.message);
        process.exit(1);
      }
      console.warn('[sync-submodules] Warning: Git submodule command failed or incomplete:', err.message);
    }
  } else {
    console.log('[sync-submodules] .gitmodules is empty. Skipping submodule update.');
  }
} else {
  console.log('[sync-submodules] No .gitmodules found. Skipping Git submodule update.');
}

// 3. Scan content/docs/apps/*/ for missing frontmatter titles
if (existsSync(APPS_DOCS_DIR)) {
  const mdFiles = getMarkdownFiles(APPS_DOCS_DIR);
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

console.log('[sync-submodules] Submodule synchronization and validation completed successfully.');
