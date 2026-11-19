import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  computeSha256,
  filePathToDocSlug,
  readBinderManifest,
} from '../scripts/lib/docs-utils.mjs';
import { generateBinderIndex } from '../scripts/build-binder-index.mjs';
import { detectBinderDrift, syncTrackerAlert } from '../scripts/check-binder-drift.mjs';
import { stampBinderManifest } from '../scripts/mark-binder-printed.mjs';
import { getContentType, resolveStaticFile } from '../scripts/serve-static.mjs';
import {
  buildVerifyUrl,
  normalizeDocSlug,
  verifyPrintedStamp,
} from '../src/lib/binder.ts';

const tempDirs = [];

function createTempDocsWorkspace() {
  const dir = mkdtempSync(join(tmpdir(), 'sunshade-docs-test-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'content', 'docs', 'shared-architecture'), { recursive: true });
  writeFileSync(
    join(dir, 'content', 'docs', 'index.mdx'),
    '---\ntitle: Overview\n---\n\nWelcome.\n',
    'utf8'
  );
  writeFileSync(
    join(dir, 'content', 'docs', 'shared-architecture', 'auth-sso.mdx'),
    '---\ntitle: Auth SSO\n---\n\nSSO rules.\n',
    'utf8'
  );
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('docs-utils', () => {
  it('computes identical SHA-256 digests for LF and CRLF line endings', () => {
    const lf = '---\ntitle: Test\n---\n\nHello world\n';
    const crlf = '---\r\ntitle: Test\r\n---\r\n\r\nHello world\r\n';
    assert.equal(computeSha256(lf), computeSha256(crlf));
  });

  it('converts markdown relative paths into Fumadocs slugs', () => {
    assert.equal(filePathToDocSlug('index.mdx'), '/docs');
    assert.equal(filePathToDocSlug('shared-architecture/index.mdx'), '/docs/shared-architecture');
    assert.equal(filePathToDocSlug('shared-architecture/auth-sso.mdx'), '/docs/shared-architecture/auth-sso');
    assert.equal(filePathToDocSlug('apps/cozy/getting-started.md'), '/docs/apps/cozy/getting-started');
  });
});

describe('Living Binder manifest, drift detection, and index generation', () => {
  it('stamps baseline and reports zero drift when unmodified', () => {
    const dir = createTempDocsWorkspace();
    const manifestPath = join(dir, 'binder-manifest.json');

    const stamped = stampBinderManifest({
      rootDir: dir,
      manifestPath,
      printedBy: 'test-runner',
      printedAt: '2026-11-19T12:00:00.000Z',
    });

    assert.equal(stamped.stampedCount, 2);
    const drift = detectBinderDrift({ rootDir: dir, manifestPath });
    assert.equal(drift.hasDrift, false);
    assert.equal(drift.driftedCount, 0);
  });

  it('detects added, modified, and removed documents accurately', () => {
    const dir = createTempDocsWorkspace();
    const manifestPath = join(dir, 'binder-manifest.json');

    stampBinderManifest({
      rootDir: dir,
      manifestPath,
      printedBy: 'test-runner',
      printedAt: '2026-11-19T12:00:00.000Z',
    });

    // Modify one, add one, remove one
    writeFileSync(
      join(dir, 'content', 'docs', 'index.mdx'),
      '---\ntitle: Overview\n---\n\nUpdated welcome text.\n',
      'utf8'
    );
    writeFileSync(
      join(dir, 'content', 'docs', 'shared-architecture', 'new-guide.mdx'),
      '---\ntitle: New Guide\n---\n\nBrand new content.\n',
      'utf8'
    );
    rmSync(join(dir, 'content', 'docs', 'shared-architecture', 'auth-sso.mdx'));

    const drift = detectBinderDrift({ rootDir: dir, manifestPath });
    assert.equal(drift.hasDrift, true);
    assert.equal(drift.modified.length, 1);
    assert.equal(drift.modified[0].slug, '/docs');
    assert.equal(drift.added.length, 1);
    assert.equal(drift.added[0].slug, '/docs/shared-architecture/new-guide');
    assert.equal(drift.removed.length, 1);
    assert.equal(drift.removed[0].slug, '/docs/shared-architecture/auth-sso');
  });

  it('supports partial --only stamping without dropping other baseline docs', () => {
    const dir = createTempDocsWorkspace();
    const manifestPath = join(dir, 'binder-manifest.json');

    stampBinderManifest({ rootDir: dir, manifestPath });

    writeFileSync(
      join(dir, 'content', 'docs', 'index.mdx'),
      '---\ntitle: Overview\n---\n\nModified index.\n',
      'utf8'
    );
    writeFileSync(
      join(dir, 'content', 'docs', 'shared-architecture', 'auth-sso.mdx'),
      '---\ntitle: Auth SSO\n---\n\nModified SSO.\n',
      'utf8'
    );

    stampBinderManifest({
      rootDir: dir,
      manifestPath,
      only: 'shared-architecture/auth-sso.mdx',
    });

    const drift = detectBinderDrift({ rootDir: dir, manifestPath });
    assert.equal(drift.modified.length, 1);
    assert.equal(drift.modified[0].slug, '/docs');
  });

  it('generates binder-index.json with expected schema', () => {
    const dir = createTempDocsWorkspace();
    const manifestPath = join(dir, 'binder-manifest.json');
    stampBinderManifest({
      rootDir: dir,
      manifestPath,
      printedAt: '2026-11-19T12:00:00.000Z',
    });

    const index = generateBinderIndex({
      rootDir: dir,
      manifestPath,
      baseUrl: 'https://docs.sunshade.icu',
      generatedAt: '2026-11-19T12:05:00.000Z',
    });

    assert.equal(index.documentCount, 2);
    assert.equal(index.manifestLastPrintedAt, '2026-11-19T12:00:00.000Z');
    assert.ok(index.documents['/docs']);
    assert.ok(index.documents['/docs/shared-architecture/auth-sso']);
    assert.equal(index.documents['/docs/shared-architecture/auth-sso'].title, 'Auth SSO');
  });

  it('does not overwrite manifest when --only matches zero documents', () => {
    const dir = createTempDocsWorkspace();
    const manifestPath = join(dir, 'binder-manifest.json');

    stampBinderManifest({
      rootDir: dir,
      manifestPath,
      printedBy: 'initial-operator',
      printedAt: '2026-11-19T10:00:00.000Z',
    });

    const failedStamp = stampBinderManifest({
      rootDir: dir,
      manifestPath,
      only: 'nonexistent/page.mdx',
      printedBy: 'failed-operator',
      printedAt: '2026-11-19T11:00:00.000Z',
    });

    assert.equal(failedStamp.stampedCount, 0);
    const persisted = readBinderManifest(manifestPath);
    assert.equal(persisted.printedBy, 'initial-operator');
    assert.equal(persisted.lastPrintedAt, '2026-11-19T10:00:00.000Z');
  });

  it('catches Tracker fetch failures in syncTrackerAlert without throwing', async () => {
    const prevKey = process.env.TRACKER_API_KEY;
    const prevFetch = globalThis.fetch;
    process.env.TRACKER_API_KEY = 'test-key';
    globalThis.fetch = async () => {
      throw new Error('network unreachable');
    };

    try {
      await assert.doesNotReject(() =>
        syncTrackerAlert({
          hasDrift: true,
          driftedCount: 1,
          lastPrintedAt: null,
          lastPrintedCommit: null,
          modified: [{ slug: '/docs', filePath: 'index.mdx', baselineHash: 'aaa', currentHash: 'bbb', currentCommit: 'ccc' }],
          added: [],
          removed: [],
        })
      );
    } finally {
      globalThis.fetch = prevFetch;
      if (prevKey === undefined) delete process.env.TRACKER_API_KEY;
      else process.env.TRACKER_API_KEY = prevKey;
    }
  });
});

describe('Static export server path resolution', () => {
  it('resolves extensionless routes, static assets, and blocks traversal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sunshade-static-test-'));
    tempDirs.push(dir);
    mkdirSync(join(dir, 'api'), { recursive: true });
    mkdirSync(join(dir, 'docs', 'shared-architecture'), { recursive: true });
    mkdirSync(join(dir, 'shared-architecture'), { recursive: true });

    writeFileSync(join(dir, 'index.html'), '<html>home</html>');
    writeFileSync(join(dir, 'docs.html'), '<html>docs</html>');
    writeFileSync(join(dir, 'docs', 'shared-architecture', 'auth-sso.html'), '<html>sso</html>');
    writeFileSync(join(dir, 'api', 'search'), '{"type":"simple"}');
    writeFileSync(join(dir, 'shared-architecture', 'llms-full.txt'), '# Shared');

    assert.equal(resolveStaticFile(dir, '/'), join(dir, 'index.html'));
    assert.equal(resolveStaticFile(dir, '/docs'), join(dir, 'docs.html'));
    assert.equal(
      resolveStaticFile(dir, '/docs/shared-architecture/auth-sso'),
      join(dir, 'docs', 'shared-architecture', 'auth-sso.html')
    );
    const searchFile = resolveStaticFile(dir, '/api/search');
    assert.equal(searchFile, join(dir, 'api', 'search'));
    assert.equal(getContentType(searchFile, '/api/search'), 'application/json; charset=utf-8');
    const llmsFile = resolveStaticFile(dir, '/shared-architecture/llms-full.txt');
    assert.equal(getContentType(llmsFile, '/shared-architecture/llms-full.txt'), 'text/plain; charset=utf-8');
    assert.equal(resolveStaticFile(dir, '/../package.json'), null);
  });
});

describe('Living Binder verification logic', () => {
  const sampleIndex = {
    version: 1,
    generatedAt: '2026-11-19T12:05:00.000Z',
    baseUrl: 'https://docs.sunshade.icu',
    portalRepo: 'tympollack/sunshade-docs',
    portalCommit: '6ea8ee0123456789',
    shortPortalCommit: '6ea8ee0',
    manifestLastPrintedAt: '2026-11-19T12:00:00.000Z',
    manifestLastPrintedCommit: '6ea8ee0123456789',
    documentCount: 1,
    documents: {
      '/docs/shared-architecture/auth-sso': {
        slug: '/docs/shared-architecture/auth-sso',
        filePath: 'shared-architecture/auth-sso.mdx',
        title: 'Authentication and Single Sign-On',
        sha256: '513d78f77c560000111122223333444455556666777788889999aaaabbbbcccc',
        shortHash: '513d78f77c56',
        commit: 'a7b7fcc9988776655',
        shortCommit: 'a7b7fcc',
        committedAt: '2026-11-18T18:00:00Z',
        sourceRepo: 'sunshade-docs',
      },
    },
  };

  it('normalizes slugs and builds verification URLs', () => {
    assert.equal(normalizeDocSlug('docs/shared-architecture/'), '/docs/shared-architecture');
    const url = buildVerifyUrl('https://docs.sunshade.icu/', sampleIndex.documents['/docs/shared-architecture/auth-sso']);
    assert.equal(
      url,
      'https://docs.sunshade.icu/binder/verify?slug=%2Fdocs%2Fshared-architecture%2Fauth-sso&hash=513d78f77c56&commit=a7b7fcc'
    );
  });

  it('returns current when hash prefix matches', () => {
    const res = verifyPrintedStamp(sampleIndex, {
      slug: '/docs/shared-architecture/auth-sso',
      hash: '513d78f77c56',
      commit: 'a7b7fcc',
    });
    assert.equal(res.status, 'current');
  });

  it('returns outdated when hash differs', () => {
    const res = verifyPrintedStamp(sampleIndex, {
      slug: '/docs/shared-architecture/auth-sso',
      hash: 'deadbeef1234',
      commit: 'a7b7fcc',
    });
    assert.equal(res.status, 'outdated');
  });

  it('returns removed when slug is missing from index', () => {
    const res = verifyPrintedStamp(sampleIndex, {
      slug: '/docs/deleted-page',
      hash: '513d78f77c56',
    });
    assert.equal(res.status, 'removed');
  });

  it('returns idle when no slug is passed', () => {
    const res = verifyPrintedStamp(sampleIndex, {});
    assert.equal(res.status, 'idle');
  });
});
