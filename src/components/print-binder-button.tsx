'use client';

import { Printer } from 'lucide-react';

export function PrintBinderButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Print Sheet</span>
    </button>
  );
}
