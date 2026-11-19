#!/usr/bin/env node
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BINDER_MANIFEST_PATH,
  ROOT_DIR,
  readBinderManifest,
  scanDocumentationRecords,
} from './lib/docs-utils.mjs';

const TRACKER_BASE_URL = process.env.TRACKER_BASE_URL || 'https://track.sunshade.icu';
const TRACKER_TENANT = process.env.TRACKER_TENANT || 'pym-energy';
const TRACKER_PROJECT = process.env.TRACKER_PROJECT || 'sunshade-docs';
const ALERT_REF_ID = 'TASK-DOCS-BINDER-REPRINT-ALERT';

export function detectBinderDrift({
  rootDir = ROOT_DIR,
  manifestPath = join(rootDir, 'binder-manifest.json'),
} = {}) {
  const currentRecords = scanDocumentationRecords(rootDir);
  const manifest = readBinderManifest(manifestPath);
  const baselineDocs = manifest.documents || {};

  const currentByPath = new Map(currentRecords.map((r) => [r.filePath, r]));
  const added = [];
  const modified = [];
  const removed = [];

  for (const current of currentRecords) {
    const baseline = baselineDocs[current.filePath];
    if (!baseline) {
      added.push({
        filePath: current.filePath,
        slug: current.slug,
        title: current.title,
        currentHash: current.shortHash,
        currentCommit: current.shortCommit,
        committedAt: current.committedAt,
      });
      continue;
    }

    if (baseline.sha256 !== current.sha256) {
      modified.push({
        filePath: current.filePath,
        slug: current.slug,
        title: current.title,
        baselineHash: (baseline.sha256 || '').slice(0, 12),
        currentHash: current.shortHash,
        baselineCommit: baseline.shortCommit || (baseline.commit || '').slice(0, 7) || 'unknown',
        currentCommit: current.shortCommit,
        committedAt: current.committedAt,
      });
    }
  }

  for (const [filePath, baseline] of Object.entries(baselineDocs)) {
    if (!currentByPath.has(filePath)) {
      removed.push({
        filePath,
        slug: baseline.slug || '',
        title: baseline.title || filePath,
        baselineHash: (baseline.sha256 || '').slice(0, 12),
      });
    }
  }

  const driftedCount = added.length + modified.length + removed.length;
  return {
    hasDrift: driftedCount > 0,
    driftedCount,
    totalCurrent: currentRecords.length,
    totalBaseline: Object.keys(baselineDocs).length,
    lastPrintedAt: manifest.lastPrintedAt || null,
    lastPrintedCommit: manifest.lastPrintedCommit || null,
    added,
    modified,
    removed,
  };
}

function formatDriftSummary(report) {
  const lines = [
    `Living Binder Drift Detected (${report.driftedCount} change(s))`,
    `Last Printed Baseline: ${report.lastPrintedAt || 'never'} (${report.lastPrintedCommit || 'none'})`,
    '',
  ];

  if (report.modified.length > 0) {
    lines.push('Modified Documents (Reprint Recommended):');
    for (const item of report.modified) {
      lines.push(`- ${item.slug} (${item.filePath}): ${item.baselineHash} -> ${item.currentHash} @ ${item.currentCommit}`);
    }
    lines.push('');
  }
  if (report.added.length > 0) {
    lines.push('Added Documents (New Binder Inserts):');
    for (const item of report.added) {
      lines.push(`- ${item.slug} (${item.filePath}): ${item.currentHash} @ ${item.currentCommit}`);
    }
    lines.push('');
  }
  if (report.removed.length > 0) {
    lines.push('Removed Documents (Retire From Binder):');
    for (const item of report.removed) {
      lines.push(`- ${item.slug || item.filePath} (${item.filePath})`);
    }
    lines.push('');
  }

  lines.push('After printing updated sheets, run: npm run binder:mark-printed');
  return lines.join('\n');
}

async function syncTrackerAlert(report) {
  const apiKey = process.env.TRACKER_API_KEY || process.env.SUNSHADE_TRACKER_TOKEN || '';
  if (!apiKey) {
    console.log('[binder:check] No TRACKER_API_KEY configured; skipping Tracker notification.');
    return;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(
    `${TRACKER_BASE_URL.replace(/\/$/, '')}/api/v1/items?project_slug=${encodeURIComponent(TRACKER_PROJECT)}`,
    { headers }
  );
  if (!listRes.ok) {
    console.warn(`[binder:check] Warning: Tracker lookup failed (${listRes.status}).`);
    return;
  }

  const listData = await listRes.json();
  const existing = Array.isArray(listData?.items)
    ? listData.items.find((it) => it.external_ref_id === ALERT_REF_ID)
    : null;

  if (!report.hasDrift) {
    if (existing && existing.status !== 'complete') {
      const patchRes = await fetch(`${TRACKER_BASE_URL.replace(/\/$/, '')}/api/v1/items`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: existing.id,
          status: 'complete',
          description: 'Living Binder matches the current documentation baseline.',
        }),
      });
      if (patchRes.ok) {
        console.log(`[binder:check] Resolved ${ALERT_REF_ID} in SunShade Tracker.`);
      }
    }
    return;
  }

  const description = formatDriftSummary(report);
  const title = `Reprint Living Binder (${report.driftedCount} doc update${report.driftedCount === 1 ? '' : 's'})`;
  const metadata = {
    ...(existing?.metadata || {}),
    priority: 'Medium',
    drifted_count: report.driftedCount,
    last_checked_at: new Date().toISOString(),
    modified_slugs: report.modified.map((d) => d.slug),
    added_slugs: report.added.map((d) => d.slug),
    removed_slugs: report.removed.map((d) => d.slug),
  };

  if (existing) {
    const patchRes = await fetch(`${TRACKER_BASE_URL.replace(/\/$/, '')}/api/v1/items`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        id: existing.id,
        title,
        description,
        status: existing.status === 'complete' ? 'not_started' : existing.status,
        metadata,
      }),
    });
    if (patchRes.ok) {
      console.log(`[binder:check] Updated Tracker alert ${ALERT_REF_ID}.`);
    } else {
      console.warn(`[binder:check] Warning: Failed to update Tracker alert (${patchRes.status}).`);
    }
  } else {
    const createRes = await fetch(`${TRACKER_BASE_URL.replace(/\/$/, '')}/api/v1/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenant_slug: TRACKER_TENANT,
        project_slug: TRACKER_PROJECT,
        external_ref_id: ALERT_REF_ID,
        item_type: 'task',
        status: 'not_started',
        title,
        description,
        metadata,
      }),
    });
    if (createRes.ok) {
      console.log(`[binder:check] Created Tracker alert ${ALERT_REF_ID}.`);
    } else {
      console.warn(`[binder:check] Warning: Failed to create Tracker alert (${createRes.status}).`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const jsonMode = args.has('--json');
  const failOnDrift = args.has('--fail-on-drift');
  const notifyTracker = args.has('--notify-tracker') || process.env.CI === 'true';

  const report = detectBinderDrift({
    rootDir: ROOT_DIR,
    manifestPath: BINDER_MANIFEST_PATH,
  });

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.hasDrift) {
    console.log(`[binder:check] ${formatDriftSummary(report)}`);
  } else {
    console.log(
      `[binder:check] Living Binder is up to date (${report.totalCurrent} document(s), last printed ${report.lastPrintedAt || 'never'}).`
    );
  }

  if (notifyTracker) {
    await syncTrackerAlert(report);
  }

  if (failOnDrift && report.hasDrift) {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  await main();
}
