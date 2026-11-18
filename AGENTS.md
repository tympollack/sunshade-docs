# SunShade Systems: Documentation Portal Agent Guidelines

You are working in `sunshade-docs` (`docs.sunshade.icu`), the central documentation portal for SunShade Systems.
This repository is built with **Next.js (App Router)** and **Fumadocs MDX**.

---

## Critical Ecosystem Guardrails (Non-Negotiable)

1. **Package Manager:**
   - Use **`npm`** exclusively. Never use Yarn or pnpm.

2. **Database Migration Law:**
   - **DO NOT** create any `supabase/migrations/*.sql` files in this repository.
   - `sunshade-docs` is a static/edge-rendered documentation portal with zero direct database migrations. Database migrations belong exclusively in `sunshade-db-platform`.

3. **Environment & Shell Hygiene:**
   - **NEVER** commit hardcoded local paths (`C:\Users\...`). Use repository-relative POSIX paths exclusively.
   - Use `-stag` (`docs-stag.sunshade.icu`) for staging hostnames, never `-staging`.
   - When running Windows PowerShell commands, chain with `;` or separate lines—never `&&`.

4. **Plain-Language "Pap Test" Standard:**
   - All documentation overview pages and navigation labels must use direct, active, single-breath sentences free of unnecessary jargon.

5. **AI "Catalog" Pattern:**
   - Root librarian index is located at `public/llms.txt`.
   - Application context bundles are dynamically rendered at `/[project]/llms-full.txt`. Every application bundle concatenates `content/docs/shared-architecture/` automatically so agents receive SSO and database rules without ingesting unrelated apps.

6. **Living Binder Print Standard:**
   - Maintain print-friendly CSS rules in `src/app/global.css`. When printed (Ctrl+P), sidebars, headers, search bars, and table of contents must remain hidden, expanding content to full width with page-break avoidance for tables and callouts.

---

## Common Commands

- Sync Git Submodules: `npm run sync-docs`
- Register Submodule: `npm run docs:add -- --repo <git-url> --slug <slug>`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Dev Server: `npm run dev`

---

## Fumadocs Reference Links

- Writing pages: https://fumadocs.dev/docs/next/markdown.md
- Organizing pages and folders: https://fumadocs.dev/docs/next/page-conventions.md
- Customizing the UI: https://fumadocs.dev/docs/next/guides/customize-ui.md
- Changing the theme and colors: https://fumadocs.dev/docs/ui/theme.md
- Full Fumadocs index: https://fumadocs.dev/llms.txt
