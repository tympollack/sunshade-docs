export interface BinderDocumentRecord {
  slug: string;
  filePath: string;
  title: string;
  sha256: string;
  shortHash: string;
  commit: string;
  shortCommit: string;
  committedAt: string;
  sourceRepo: string;
}

export interface BinderIndex {
  version: number;
  generatedAt: string;
  baseUrl: string;
  portalRepo: string;
  portalCommit: string;
  shortPortalCommit: string;
  manifestLastPrintedAt: string | null;
  manifestLastPrintedCommit: string | null;
  documentCount: number;
  documents: Record<string, BinderDocumentRecord>;
}

export interface PrintedStampQuery {
  slug?: string | null;
  hash?: string | null;
  commit?: string | null;
  ts?: string | null;
}

export type BinderVerificationStatus =
  | 'idle'
  | 'current'
  | 'outdated'
  | 'removed'
  | 'missing-stamp';

export interface BinderVerificationResult {
  status: BinderVerificationStatus;
  slug: string;
  printedHash: string;
  printedCommit: string;
  printedTs: string;
  liveDocument: BinderDocumentRecord | null;
  reason: string;
}

export function normalizeDocSlug(rawSlug: string): string {
  const trimmed = rawSlug.trim();
  if (!trimmed) return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

export function buildVerifyPath(record: Pick<BinderDocumentRecord, 'slug' | 'shortHash' | 'shortCommit'>): string {
  const params = new URLSearchParams({
    slug: record.slug,
    hash: record.shortHash,
    commit: record.shortCommit,
  });
  return `/binder/verify?${params.toString()}`;
}

export function buildVerifyUrl(
  baseUrl: string,
  record: Pick<BinderDocumentRecord, 'slug' | 'shortHash' | 'shortCommit'>
): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}${buildVerifyPath(record)}`;
}

export function formatUtcDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function matchesHexPrefix(fullValue: string, queryValue: string): boolean {
  const candidate = queryValue.trim().toLowerCase();
  const target = fullValue.trim().toLowerCase();
  if (!candidate || !target) return false;
  if (candidate === target) return true;
  if (candidate.length < 6) return false;
  return target.startsWith(candidate);
}

export function verifyPrintedStamp(
  index: BinderIndex,
  query: PrintedStampQuery
): BinderVerificationResult {
  const slug = normalizeDocSlug(query.slug || '');
  const printedHash = (query.hash || '').trim().toLowerCase();
  const printedCommit = (query.commit || '').trim().toLowerCase();
  const printedTs = (query.ts || '').trim();

  if (!slug) {
    return {
      status: 'idle',
      slug: '',
      printedHash,
      printedCommit,
      printedTs,
      liveDocument: null,
      reason: 'Select a document or scan a Living Binder QR code to verify currency.',
    };
  }

  const liveDocument = index.documents[slug] ?? null;

  if (!liveDocument) {
    return {
      status: 'removed',
      slug,
      printedHash,
      printedCommit,
      printedTs,
      liveDocument: null,
      reason: `Document "${slug}" was not found in the live Living Binder index. It may have been moved or retired.`,
    };
  }

  if (!printedHash && !printedCommit) {
    return {
      status: 'missing-stamp',
      slug,
      printedHash,
      printedCommit,
      printedTs,
      liveDocument,
      reason: 'No hash or commit stamp was supplied in the verification link.',
    };
  }

  if (printedHash) {
    const hashMatches = matchesHexPrefix(liveDocument.sha256, printedHash);
    if (hashMatches) {
      return {
        status: 'current',
        slug,
        printedHash,
        printedCommit,
        printedTs,
        liveDocument,
        reason: 'Printed content hash matches the live deployed documentation.',
      };
    }

    return {
      status: 'outdated',
      slug,
      printedHash,
      printedCommit,
      printedTs,
      liveDocument,
      reason: 'Document content has changed since this sheet was printed. Reprint recommended.',
    };
  }

  const commitMatches = matchesHexPrefix(liveDocument.commit, printedCommit);
  if (commitMatches) {
    return {
      status: 'current',
      slug,
      printedHash,
      printedCommit,
      printedTs,
      liveDocument,
      reason: 'Printed commit matches the live deployed documentation.',
    };
  }

  return {
    status: 'outdated',
    slug,
    printedHash,
    printedCommit,
    printedTs,
    liveDocument,
    reason: 'A newer commit exists for this document since this sheet was printed.',
  };
}
