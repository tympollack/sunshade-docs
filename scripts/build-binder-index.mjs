#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BINDER_INDEX_PATH,
  BINDER_MANIFEST_PATH,
  ROOT_DIR,
  getPortalGitMeta,
  readBinderManifest,
  scanDocumentationRecords,
} from './lib/docs-utils.mjs';

export function generateBinderIndex({
  rootDir = ROOT_DIR,
  manifestPath = join(rootDir, 'binder-manifest.json'),
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://docs.sunshade.icu',
  generatedAt = new Date().toISOString(),
} = {}) {
  const records = scanDocumentationRecords(rootDir);
  const portalMeta = getPortalGitMeta(rootDir);
  const manifest = readBinderManifest(manifestPath);

  const documents = {};
  for (const record of records) {
    documents[record.slug] = {
      slug: record.slug,
      filePath: record.filePath,
      title: record.title,
      sha256: record.sha256,
      shortHash: record.shortHash,
      commit: record.commit,
      shortCommit: record.shortCommit,
      committedAt: record.committedAt,
      sourceRepo: record.sourceRepo,
    };
  }

  return {
    version: 1,
    generatedAt,
    baseUrl: baseUrl.replace(/\/$/, ''),
    portalRepo: portalMeta.portalRepo,
    portalCommit: portalMeta.portalCommit,
    shortPortalCommit: portalMeta.shortPortalCommit,
    manifestLastPrintedAt: manifest.lastPrintedAt || null,
    manifestLastPrintedCommit: manifest.lastPrintedCommit || null,
    documentCount: records.length,
    documents,
  };
}

export function writeBinderIndexFile(outputPath = BINDER_INDEX_PATH, options = {}) {
  const index = generateBinderIndex(options);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const index = writeBinderIndexFile(BINDER_INDEX_PATH, {
    rootDir: ROOT_DIR,
    manifestPath: BINDER_MANIFEST_PATH,
  });
  console.log(
    `[binder:index] Generated public/binder-index.json (${index.documentCount} documents, portal commit ${index.shortPortalCommit}).`
  );
}
