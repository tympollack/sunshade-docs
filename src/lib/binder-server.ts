import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BinderDocumentRecord, BinderIndex } from './binder';

export function readBinderIndexFromDisk(): BinderIndex | null {
  const indexPath = join(process.cwd(), 'public', 'binder-index.json');
  if (!existsSync(indexPath)) return null;

  try {
    return JSON.parse(readFileSync(indexPath, 'utf8')) as BinderIndex;
  } catch {
    return null;
  }
}

export function getBinderDocumentForUrl(url: string): {
  record: BinderDocumentRecord | null;
  baseUrl: string;
} {
  const fallbackBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://docs.sunshade.icu').replace(/\/$/, '');
  const index = readBinderIndexFromDisk();
  if (!index) {
    return { record: null, baseUrl: fallbackBaseUrl };
  }

  return {
    record: index.documents[url] ?? null,
    baseUrl: index.baseUrl || fallbackBaseUrl,
  };
}
