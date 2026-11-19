'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  type BinderIndex,
  buildVerifyPath,
  formatUtcDateTime,
  verifyPrintedStamp,
} from '@/lib/binder';

export function BinderVerifier() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slugParam = searchParams.get('slug') ?? '';
  const hashParam = searchParams.get('hash') ?? '';
  const commitParam = searchParams.get('commit') ?? '';
  const tsParam = searchParams.get('ts') ?? '';

  const [index, setIndex] = useState<BinderIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [manualSlug, setManualSlug] = useState(slugParam);
  const [manualHash, setManualHash] = useState(hashParam);
  const [manualCommit, setManualCommit] = useState(commitParam);

  useEffect(() => {
    setManualSlug(slugParam);
    setManualHash(hashParam);
    setManualCommit(commitParam);
  }, [slugParam, hashParam, commitParam]);

  async function loadBinderIndex() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/binder-index.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch /binder-index.json (HTTP ${response.status})`);
      }
      const data = (await response.json()) as BinderIndex;
      setIndex(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Living Binder ledger.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBinderIndex();
  }, []);

  const verification = useMemo(() => {
    if (!index) return null;
    return verifyPrintedStamp(index, {
      slug: slugParam,
      hash: hashParam,
      commit: commitParam,
      ts: tsParam,
    });
  }, [index, slugParam, hashParam, commitParam, tsParam]);

  const sortedDocuments = useMemo(() => {
    if (!index) return [];
    return Object.values(index.documents).sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
  }, [index]);

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (manualSlug.trim()) params.set('slug', manualSlug.trim());
    if (manualHash.trim()) params.set('hash', manualHash.trim());
    if (manualCommit.trim()) params.set('commit', manualCommit.trim());
    router.push(`/binder/verify?${params.toString()}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            SunShade Living Binder
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mt-1">
            Print Currency Verifier
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Compare a printed binder sheet stamp against the live deployed documentation ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadBinderIndex()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors self-start cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh Live Ledger</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {loading && !index && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-600 dark:text-neutral-400">
          Loading live binder commit ledger...
        </div>
      )}

      {verification && verification.status !== 'idle' && (
        <section
          aria-label="Verification Result"
          className={`rounded-xl border p-6 space-y-4 ${
            verification.status === 'current'
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30'
              : verification.status === 'outdated'
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                : 'border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {verification.status === 'current' && (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {verification.status === 'outdated' && (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {(verification.status === 'removed' || verification.status === 'missing-stamp') && (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}

            <div className="space-y-1 flex-1">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                {verification.status === 'current' && 'Current — Sheet Matches Live Docs'}
                {verification.status === 'outdated' && 'Outdated — Reprint Required'}
                {verification.status === 'removed' && 'Retired — Document Not Found'}
                {verification.status === 'missing-stamp' && 'Incomplete Stamp — Hash Required'}
              </h2>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {verification.reason}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-4 space-y-1.5 text-xs">
              <div className="font-semibold uppercase tracking-wider text-neutral-500">
                Printed Sheet Stamp
              </div>
              <div>
                Slug: <code className="font-mono">{verification.slug}</code>
              </div>
              <div>
                Hash: <code className="font-mono">{verification.printedHash || 'none'}</code>
              </div>
              <div>
                Commit: <code className="font-mono">{verification.printedCommit || 'none'}</code>
              </div>
              {verification.printedTs && (
                <div>Printed Timestamp: {formatUtcDateTime(verification.printedTs)}</div>
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-4 space-y-1.5 text-xs">
              <div className="font-semibold uppercase tracking-wider text-neutral-500">
                Live Portal Ledger
              </div>
              {verification.liveDocument ? (
                <>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {verification.liveDocument.title}
                  </div>
                  <div>
                    Hash: <code className="font-mono">{verification.liveDocument.shortHash}</code>
                  </div>
                  <div>
                    Commit: <code className="font-mono">{verification.liveDocument.shortCommit}</code>
                  </div>
                  <div>Updated: {formatUtcDateTime(verification.liveDocument.committedAt)}</div>
                </>
              ) : (
                <div className="text-neutral-500">No active document at this slug.</div>
              )}
            </div>
          </div>

          {verification.liveDocument && (
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={verification.liveDocument.slug}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
              >
                <span>
                  {verification.status === 'outdated'
                    ? 'Open & Print Updated Sheet'
                    : 'Open Live Document'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      )}

      {index && (
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Manual Stamp Lookup
            </h2>
          </div>

          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="binder-slug" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Document Slug
              </label>
              <input
                id="binder-slug"
                type="text"
                placeholder="/docs/shared-architecture/auth-sso"
                value={manualSlug}
                onChange={(e) => setManualSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
              />
            </div>

            <div>
              <label htmlFor="binder-hash" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Content Hash (prefix)
              </label>
              <input
                id="binder-hash"
                type="text"
                placeholder="a1b2c3d4e5f6"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
              />
            </div>

            <div>
              <label htmlFor="binder-commit" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Commit SHA (optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="binder-commit"
                  type="text"
                  placeholder="6ea8ee0"
                  value={manualCommit}
                  onChange={(e) => setManualCommit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                >
                  Check
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {index && (
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Live Indexed Living Binder Ledger ({index.documentCount})
              </h2>
              <p className="text-xs text-neutral-500">
                Portal commit <code className="font-mono">{index.shortPortalCommit}</code> &bull; Built{' '}
                {formatUtcDateTime(index.generatedAt)}
                {index.manifestLastPrintedAt && (
                  <> &bull; Last physical print baseline {formatUtcDateTime(index.manifestLastPrintedAt)}</>
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Document</th>
                  <th className="py-2 pr-4 font-semibold">Commit</th>
                  <th className="py-2 pr-4 font-semibold">Content Hash</th>
                  <th className="py-2 pr-4 font-semibold">Updated</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {sortedDocuments.map((doc) => (
                  <tr key={doc.slug}>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {doc.title}
                      </div>
                      <div className="font-mono text-[11px] text-neutral-500">{doc.slug}</div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono">{doc.shortCommit}</td>
                    <td className="py-2.5 pr-4 font-mono">{doc.shortHash}</td>
                    <td className="py-2.5 pr-4 text-neutral-600 dark:text-neutral-400">
                      {formatUtcDateTime(doc.committedAt)}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap space-x-3">
                      <Link
                        href={buildVerifyPath(doc)}
                        className="text-neutral-700 dark:text-neutral-300 hover:underline font-medium"
                      >
                        Test Verify
                      </Link>
                      <Link
                        href={doc.slug}
                        className="text-neutral-900 dark:text-neutral-100 hover:underline font-semibold"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
