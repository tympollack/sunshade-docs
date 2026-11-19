# SunShade Systems Documentation Portal (`sunshade-docs`)

> Central documentation portal and Living Binder engine for the SunShade Systems ecosystem (`docs.sunshade.icu`).

Built with **Next.js (App Router)** and **Fumadocs MDX**.

---

## Architecture Overview

This repository acts as the single documentation rendering engine for the entire SunShade ecosystem. Individual product repositories (`sunshade-hub`, `sunshade-tracker`, `cozy`, `patchwork`, `votary`, `dart-up`, `sunshade-db-platform`, etc.) author markdown inside their own `/docs` folders, which this portal ingests via **Git Submodules** and serves both to human readers and to AI coding agents via a scoped **`llms.txt` Catalog Pattern**.

```text
sunshade-docs/
├── .github/
│   └── workflows/
│       └── deploy-docs.yml             # Syncs submodules, runs build, deploys to Cloudflare Pages
├── content/
│   └── docs/
│       ├── index.mdx                   # Ecosystem overview & Living Binder index
│       ├── meta.json                   # Root sidebar ordering
│       ├── shared-architecture/        # Core Hub SSO, sunshade-db-platform boundaries, & invariants
│       │   ├── index.mdx
│       │   ├── auth-sso.mdx
│       │   └── database-boundaries.mdx
│       └── apps/                       # Mount point for per-repo Git Submodules (e.g., apps/cozy -> cozy/docs)
│           └── .gitkeep
├── public/
│   ├── _redirects                      # SPA/Cloudflare Pages fallback & clean .txt headers
│   ├── _headers                        # CORS, JSON, & no-cache headers for llms.txt and binder-index.json
│   ├── binder-index.json               # Build-time commit & SHA-256 ledger for Living Binder QR verification
│   └── llms.txt                        # Root Librarian Catalog (< 4,000 tokens, 15-word summaries + links)
├── scripts/
│   ├── lib/docs-utils.mjs              # Shared markdown, hashing, and submodule git metadata helpers
│   ├── sync-submodules.mjs             # Initializes/updates all Git Submodules and validates frontmatter
│   ├── add-project-submodule.mjs       # Helper CLI: `npm run docs:add -- --repo <git-url> --slug <slug>`
│   ├── build-binder-index.mjs          # Generates public/binder-index.json commit ledger
│   ├── check-binder-drift.mjs          # Detects printed binder drift and alerts SunShade Tracker
│   ├── mark-binder-printed.mjs         # Stamps printed baseline hashes into binder-manifest.json
│   └── provision-cloudflare-pages.mjs  # Idempotent Cloudflare Pages project & custom domain setup
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with Fumadocs RootProvider (static search)
│   │   ├── (home)/
│   │   │   └── page.tsx                # Landing page linking to Human Docs, Binder Verifier, & llms.txt
│   │   ├── binder/
│   │   │   └── verify/page.tsx         # Static /binder/verify QR currency verification route
│   │   ├── docs/
│   │   │   └── [[...slug]]/
│   │   │       └── page.tsx            # Fumadocs MDX page renderer with <BinderPrintHeader />
│   │   └── [project]/
│   │       └── llms-full.txt/
│   │           └── route.ts            # Static-exported scoped AI context bundle (App Docs + Shared Arch)
│   ├── components/
│   │   ├── binder-print-header.tsx     # Scannable QR stamp header for printed Living Binder sheets
│   │   └── binder-verifier.tsx         # Client currency verifier comparing QR stamps to /binder-index.json
│   └── lib/
│       ├── binder.ts                   # Pure Living Binder verification & URL helpers
│       ├── binder-server.ts            # Server-side binder-index.json loader
│       └── source.ts                   # Fumadocs MDX loader configuration
├── binder-manifest.json                # Last-printed Living Binder baseline hashes & commit metadata
├── wrangler.jsonc                      # Cloudflare Pages static output config (`out/`)
├── AGENTS.md                           # Ecosystem rules for Devin/Cursor/Claude agents
├── .env.example
├── package.json
└── source.config.ts                    # Fumadocs MDX configuration
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm (do not use Yarn or pnpm)

### Commands

```bash
# Install dependencies
npm install

# Synchronize Git submodules and validate markdown frontmatter
npm run sync-docs

# Register a new product submodule
npm run docs:add -- --repo <git-repo-url> --slug <project-slug>

# Run development server
npm run dev

# Run type check
npx tsc --noEmit

# Run automated tests
npm test

# Build static export (`out/`) for Cloudflare Pages
npm run build

# Check whether physical Living Binder printouts have drifted from docs
npm run binder:check

# Stamp current docs as printed in binder-manifest.json
npm run binder:mark-printed
```

---

## Cloudflare Pages & CI/CD Setup

The portal exports purely static assets to `out/` (`output: 'export'`). Configure these GitHub Actions secrets in repository settings:

- `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID`: Required for deploying `out/` to Cloudflare Pages (`sunshade-docs`).
- `SUBMODULES_PAT`: Personal Access Token with `repo` read access so `actions/checkout` and `sync-submodules.mjs` can pull private repository `/docs` submodules.
- `TRACKER_API_KEY`: Optional SunShade Tracker API bearer token so CI automatically creates/updates `TASK-DOCS-BINDER-REPRINT-ALERT` when printed binder drift is detected.

To provision the Cloudflare Pages project and bind `docs.sunshade.icu` + `docs-stag.sunshade.icu`:

```bash
node scripts/provision-cloudflare-pages.mjs
```

---

## AI Agent Integration (`llms.txt`)

- **Root Catalog (`/llms.txt`)**: Lightweight routing index listing all registered applications with single-line summaries and links.
- **Dynamic Scoped Bundles (`/{project}/llms-full.txt`)**: Returns clean, concatenated markdown combining the requested project's documentation with shared architecture invariants (Hub SSO and database boundaries).
- **Shared Architecture Bundle (`/shared-architecture/llms-full.txt`)**: Returns stripped, concatenated plain-text markdown of all shared architecture rules.

---

## Living Binder Printing

Any page can be printed directly using Chrome or Edge (`Ctrl+P` or `Cmd+P`). The print stylesheet automatically hides navigation sidebars, headers, search bars, and table of contents, expanding content to full width with page-break avoidance for clean physical binder insertion.
