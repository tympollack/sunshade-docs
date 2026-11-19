import Link from 'next/link';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { buildVerifyPath, buildVerifyUrl, formatUtcDateTime } from '@/lib/binder';
import { getBinderDocumentForUrl } from '@/lib/binder-server';
import { PrintBinderButton } from './print-binder-button';

interface BinderPrintHeaderProps {
  slug: string;
  title: string;
}

export async function BinderPrintHeader({ slug, title }: BinderPrintHeaderProps) {
  const { record, baseUrl } = getBinderDocumentForUrl(slug);

  const effectiveRecord = record ?? {
    slug,
    filePath: slug,
    title,
    sha256: 'unindexed',
    shortHash: 'unindexed',
    commit: 'local',
    shortCommit: 'local',
    committedAt: new Date().toISOString(),
    sourceRepo: 'sunshade-docs',
  };

  const verifyPath = buildVerifyPath(effectiveRecord);
  const verifyUrl = buildVerifyUrl(baseUrl, effectiveRecord);
  const qrSvg = await QRCode.toString(verifyUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const formattedDate = formatUtcDateTime(effectiveRecord.committedAt);

  return (
    <section
      aria-label="Living Binder Verification Stamp"
      data-binder-stamp=""
      className="mt-2 mb-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 p-3.5 print:mt-0 print:mb-5 print:rounded-none print:border print:border-neutral-900 print:bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 print:text-black">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 print:text-black" aria-hidden="true" />
              SunShade Living Binder
            </span>
            <span aria-hidden="true">&bull;</span>
            <span>{effectiveRecord.sourceRepo}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300 print:text-black">
            <span>
              Commit:{' '}
              <code className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 print:text-black">
                {effectiveRecord.shortCommit}
              </code>
            </span>
            <span>
              Hash:{' '}
              <code className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 print:text-black">
                {effectiveRecord.shortHash}
              </code>
            </span>
            <span>Updated: {formattedDate}</span>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate print:whitespace-normal print:break-all print:text-neutral-700">
            Verify currency: <span className="font-mono">{verifyUrl}</span>
          </p>

          <div className="no-print flex flex-wrap items-center gap-2 pt-1">
            <PrintBinderButton />
            <Link
              href={verifyPath}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Verify Currency
            </Link>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 print:w-20 print:h-20 p-1 bg-white border border-neutral-300 print:border-neutral-900 rounded [&>svg]:w-full [&>svg]:h-full"
            aria-label={`QR verification code for ${title}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <span className="text-[10px] font-mono text-neutral-500 print:text-black">
            SCAN TO VERIFY
          </span>
        </div>
      </div>
    </section>
  );
}
