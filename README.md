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
│   ├── _headers                        # CORS & text/plain; charset=utf-8 headers for llms.txt routes
│   └── llms.txt                        # Root Librarian Catalog (< 4,000 tokens, 15-word summaries + links)
├── scripts/
│   ├── sync-submodules.mjs             # Initializes/updates all Git Submodules and validates frontmatter
│   └── add-project-submodule.mjs       # Helper CLI: `npm run docs:add -- --repo <git-url> --slug <slug>`
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with Fumadocs RootProvider + print-friendly CSS rules
│   │   ├── (home)/
│   │   │   └── page.tsx                # Landing page linking to Human Docs, Living Binder Print View, & llms.txt
│   │   ├── docs/
│   │   │   └── [[...slug]]/
│   │   │       └── page.tsx            # Fumadocs MDX page renderer
│   │   └── [project]/
│   │       └── llms-full.txt/
│   │           └── route.ts            # Dynamic scoped AI context bundler (App Docs + Shared Architecture)
│   └── lib/
│       └── source.ts                   # Fumadocs MDX loader configuration
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

# Build for production
npm run build
```

---

## AI Agent Integration (`llms.txt`)

- **Root Catalog (`/llms.txt`)**: Lightweight routing index listing all registered applications with single-line summaries and links.
- **Dynamic Scoped Bundles (`/{project}/llms-full.txt`)**: Returns clean, concatenated markdown combining the requested project's documentation with shared architecture invariants (Hub SSO and database boundaries).
- **Shared Architecture Bundle (`/shared-architecture/llms-full.txt`)**: Returns stripped, concatenated plain-text markdown of all shared architecture rules.

---

## Living Binder Printing

Any page can be printed directly using Chrome or Edge (`Ctrl+P` or `Cmd+P`). The print stylesheet automatically hides navigation sidebars, headers, search bars, and table of contents, expanding content to full width with page-break avoidance for clean physical binder insertion.
