#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const LLMS_FILE = join(ROOT_DIR, 'public', 'llms.txt');

function parseArgs() {
  const args = process.argv.slice(2);
  let repo = null;
  let slug = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--repo' && i + 1 < args.length) {
      repo = args[++i];
    } else if (arg.startsWith('--repo=')) {
      repo = arg.slice('--repo='.length);
    } else if (arg === '--slug' && i + 1 < args.length) {
      slug = args[++i];
    } else if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length);
    }
  }

  return { repo, slug };
}

const { repo, slug } = parseArgs();

if (!repo || !slug) {
  console.error('Error: Missing required arguments.');
  console.error('Usage: npm run docs:add -- --repo <github-url> --slug <project-slug>');
  console.error('Example: npm run docs:add -- --repo https://github.com/SunShade-Systems/cozy.git --slug cozy');
  process.exit(1);
}

// Clean slug (alphanumeric and hyphens only)
const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
const targetPath = `content/docs/apps/${cleanSlug}`;

console.log(`[docs:add] Registering submodule for project "${cleanSlug}" from ${repo}...`);

try {
  // Check if submodule or directory already exists
  if (existsSync(join(ROOT_DIR, targetPath))) {
    console.warn(`[docs:add] Directory ${targetPath} already exists. Skipping git submodule add.`);
  } else {
    // Add submodule
    console.log(`[docs:add] Executing: git submodule add ${repo} ${targetPath}`);
    execSync(`git submodule add ${repo} ${targetPath}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });

    // Attempt sparse checkout for docs folder if supported
    try {
      execSync(`git -C ${targetPath} sparse-checkout init --cone`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
      });
      execSync(`git -C ${targetPath} sparse-checkout set docs`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
      });
      console.log(`[docs:add] Configured sparse checkout for /docs in ${targetPath}`);
    } catch {
      console.log(`[docs:add] Sparse checkout not applied; using standard checkout.`);
    }
  }

  // Update public/llms.txt
  if (existsSync(LLMS_FILE)) {
    let llmsContent = readFileSync(LLMS_FILE, 'utf8');
    const catalogEntryRegex = new RegExp(`https://docs\\.sunshade\\.icu/${cleanSlug}/llms-full\\.txt`);

    if (!catalogEntryRegex.test(llmsContent)) {
      const displayName = cleanSlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const newEntry = `- [${displayName}](https://docs.sunshade.icu/${cleanSlug}/llms-full.txt): Overview and architecture documentation for ${displayName}.\n`;

      if (llmsContent.includes('## Registered Applications')) {
        llmsContent = llmsContent.replace('## Registered Applications\n', `## Registered Applications\n${newEntry}`);
      } else {
        llmsContent += `\n${newEntry}`;
      }

      writeFileSync(LLMS_FILE, llmsContent, 'utf8');
      console.log(`[docs:add] Added routing entry to public/llms.txt for ${cleanSlug}.`);
    } else {
      console.log(`[docs:add] Routing entry for ${cleanSlug} already present in public/llms.txt.`);
    }
  }

  console.log(`[docs:add] Successfully added ${cleanSlug} submodule.`);
} catch (err) {
  console.error(`[docs:add] Error adding submodule:`, err.message);
  process.exit(1);
}
