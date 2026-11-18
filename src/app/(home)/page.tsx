import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center max-w-5xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mb-6">
        <span>SunShade Systems Ecosystem</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-4">
        Central Documentation Portal
      </h1>

      <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mb-12">
        Single documentation rendering engine for all SunShade applications.
        Read online, print for your Living Binder, or query via scoped AI catalogs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
        <Link
          href="/docs"
          className="group p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:underline">
              Human Docs
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Browse platform architecture, Hub Single Sign-On guides, and database migration rules.
            </p>
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-6 inline-flex items-center gap-1">
            Explore Documentation &rarr;
          </span>
        </Link>

        <Link
          href="/docs"
          className="group p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:underline">
              Living Binder View
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Print any page directly with browser print (Ctrl+P). Navigation chrome is automatically hidden.
            </p>
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-6 inline-flex items-center gap-1">
            Print-Ready Guides &rarr;
          </span>
        </Link>

        <a
          href="/llms.txt"
          className="group p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:underline">
              AI Agent Catalog
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Access the root index at <code>/llms.txt</code> or fetch scoped bundles at <code>/&#123;project&#125;/llms-full.txt</code>.
            </p>
          </div>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-6 inline-flex items-center gap-1">
            View /llms.txt &rarr;
          </span>
        </a>
      </div>

      <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 w-full flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>SunShade Systems &bull; docs.sunshade.icu</span>
        <div className="flex gap-4">
          <Link href="/docs/shared-architecture/auth-sso" className="hover:underline">
            Hub SSO
          </Link>
          <Link href="/docs/shared-architecture/database-boundaries" className="hover:underline">
            Database Rules
          </Link>
          <a href="/shared-architecture/llms-full.txt" className="hover:underline">
            Shared AI Bundle
          </a>
        </div>
      </div>
    </main>
  );
}
