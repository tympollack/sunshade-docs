#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BINDER_MANIFEST_PATH,
  ROOT_DIR,
  getPortalGitMeta,
  readBinderManifest,
  scanDocumentationRecords,
  writeBinderManifest,
} from './lib/docs-utils.mjs';

function parseArgs(argv) {
  let only = null;
  let by = null;
  let dryRun = false;
  let notifyTracker = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--only' && i + 1 < argv.length) {
      only = argv[++i];
    } else if (arg.startsWith('--only=')) {
      only = arg.slice('--only='.length);
    } else if (arg === '--by' && i + 1 < argv.length) {
      by = argv[++i];
    } else if (arg.startsWith('--by=')) {
      by = arg.slice('--by='.length);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--notify-tracker') {
      notifyTracker = true;
    }
  }

  return { only, by, dryRun, notifyTracker };
}

function resolveDefaultOperator(rootDir) {
  try {
    const name = execFileSync('git', ['config', 'user.name'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (name) return name;
  } catch {}
  return process.env.GIT_AUTHOR_NAME || process.env.USERNAME || process.env.USER || 'operator';
}

export function stampBinderManifest({
  rootDir = ROOT_DIR,
  manifestPath = join(rootDir, 'binder-manifest.json'),
  only = null,
  printedBy = null,
  printedAt = new Date().toISOString(),
  dryRun = false,
} = {}) {
  const records = scanDocumentationRecords(rootDir);
  const portalMeta = getPortalGitMeta(rootDir);
  const existingManifest = readBinderManifest(manifestPath);

  const normalizedFilter = only ? only.replace(/\\/g, '/').replace(/^\/+/, '') : null;
  const matchesFilter = (record) => {
    if (!normalizedFilter) return true;
    const slugNormalized = record.slug.replace(/^\/+/, '');
    return (
      record.filePath === normalizedFilter ||
      record.filePath.startsWith(`${normalizedFilter}/`) ||
      slugNormalized === normalizedFilter ||
      slugNormalized.startsWith(`${normalizedFilter}/`)
    );
  };

  const nextDocuments = normalizedFilter ? { ...(existingManifest.documents || {}) } : {};
  const stamped = [];

  for (const record of records) {
    if (!matchesFilter(record)) continue;

    nextDocuments[record.filePath] = {
      slug: record.slug,
      title: record.title,
      sha256: record.sha256,
      shortHash: record.shortHash,
      commit: record.commit,
      shortCommit: record.shortCommit,
      committedAt: record.committedAt,
      sourceRepo: record.sourceRepo,
      lastPrintedAt: printedAt,
    };
    stamped.push(record);
  }

  const nextManifest = {
    version: 1,
    lastPrintedAt: printedAt,
    lastPrintedCommit: portalMeta.portalCommit,
    printedBy: printedBy || resolveDefaultOperator(rootDir),
    documents: nextDocuments,
  };

  if (!dryRun) {
    writeBinderManifest(nextManifest, manifestPath);
  }

  return {
    manifest: nextManifest,
    stampedCount: stamped.length,
    stamped,
    dryRun,
  };
}

async function resolveTrackerReprintAlert() {
  const apiKey = process.env.TRACKER_API_KEY || process.env.SUNSHADE_TRACKER_TOKEN || '';
  if (!apiKey) return;

  const baseUrl = (process.env.TRACKER_BASE_URL || 'https://track.sunshade.icu').replace(/\/$/, '');
  const project = process.env.TRACKER_PROJECT || 'sunshade-docs';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(`${baseUrl}/api/v1/items?project_slug=${encodeURIComponent(project)}`, { headers });
  if (!listRes.ok) return;

  const listData = await listRes.json();
  const alertItem = Array.isArray(listData?.items)
    ? listData.items.find((it) => it.external_ref_id === 'TASK-DOCS-BINDER-REPRINT-ALERT')
    : null;

  if (alertItem && alertItem.status !== 'complete') {
    const patchRes = await fetch(`${baseUrl}/api/v1/items`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        id: alertItem.id,
        status: 'complete',
        description: 'Living Binder baseline stamped after reprint.',
      }),
    });
    if (patchRes.ok) {
      console.log('[binder:mark-printed] Marked TASK-DOCS-BINDER-REPRINT-ALERT complete in Tracker.');
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const opts = parseArgs(process.argv.slice(2));
  const result = stampBinderManifest({
    rootDir: ROOT_DIR,
    manifestPath: BINDER_MANIFEST_PATH,
    only: opts.only,
    printedBy: opts.by,
    dryRun: opts.dryRun,
  });

  if (result.stampedCount === 0) {
    console.warn('[binder:mark-printed] Warning: No matching documentation files were stamped.');
    process.exit(1);
  }

  console.log(
    `[binder:mark-printed] ${opts.dryRun ? '[DRY RUN] Would stamp' : 'Stamped'} ${result.stampedCount} document(s) at ${result.manifest.lastPrintedAt} (portal commit ${result.manifest.lastPrintedCommit.slice(0, 7)}, by ${result.manifest.printedBy}):`
  );
  for (const doc of result.stamped) {
    console.log(`  - ${doc.slug} (${doc.shortHash} @ ${doc.shortCommit})`);
  }

  if (opts.notifyTracker && !opts.dryRun) {
    await resolveTrackerReprintAlert();
  }
}
