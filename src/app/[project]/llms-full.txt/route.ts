import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';

export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams(): Promise<Array<{ project: string }>> {
  const rootDir = process.cwd();
  const appsDir = join(rootDir, 'content', 'docs', 'apps');
  const params: Array<{ project: string }> = [{ project: 'shared-architecture' }];

  if (existsSync(appsDir)) {
    const entries = readdirSync(appsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const appFiles = getMarkdownFiles(join(appsDir, entry.name));
      if (appFiles.length > 0) {
        params.push({ project: entry.name });
      }
    }
  }

  return params;
}

function getMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getMarkdownFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.md' || ext === '.mdx') {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function cleanMdxContent(rawContent: string, fileName: string): string {
  // 1. Extract and remove frontmatter
  let title = '';
  let content = rawContent;

  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    const titleMatch = yaml.match(/^\s*title\s*:\s*["']?([^"'\r\n]+)["']?/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    content = content.replace(/^---\s*\r?\n([\s\S]*?)\r?\n---/, '').trim();
  }

  // 2. Strip JSX/MDX import & export statements
  // Matches `import ... from '...';` or multi-line imports
  content = content.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  content = content.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');
  content = content.replace(/^export\s+[\s\S]*?;?\s*$/gm, '');

  // 3. Strip or transform common JSX component tags while preserving markdown code fences
  // Replace <Card title="..." href="..." /> with markdown link
  content = content.replace(/<Card\s+[^>]*?title=["']([^"']+)["'][^>]*?href=["']([^"']+)["'][^>]*?\/>/gi, '- [$1]($2)');
  content = content.replace(/<Card\s+[^>]*?href=["']([^"']+)["'][^>]*?title=["']([^"']+)["'][^>]*?\/>/gi, '- [$2]($1)');
  // Strip opening/closing JSX wrapper tags like <Cards>, </Cards>, <Tabs>, </Tabs>, <Tab>, </Tab>
  content = content.replace(/<\/?(?:Cards?|Tabs?|Steps?|Callout|Accordion|Accordions)[^>]*>/gi, '');

  // 4. Ensure document starts with a title heading if not already present
  if (title && !content.startsWith('# ')) {
    content = `# ${title}\n\n${content}`;
  } else if (!title && !content.startsWith('# ')) {
    const fallbackTitle = basename(fileName, extname(fileName))
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    content = `# ${fallbackTitle}\n\n${content}`;
  }

  return content.trim();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ project: string }> }
) {
  const { project } = await context.params;
  const rootDir = process.cwd();
  const sharedArchDir = join(rootDir, 'content', 'docs', 'shared-architecture');

  // Case 1: Shared Architecture standalone request
  if (project === 'shared-architecture') {
    const sharedFiles = getMarkdownFiles(sharedArchDir);
    if (sharedFiles.length === 0) {
      return new Response('Shared architecture documentation is currently empty.\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const sections: string[] = [
      '# SunShade Systems: Shared Architecture Documentation',
      `> Scoped context bundle for shared platform architecture, Hub SSO, and database invariants.`,
      `> Generated from: docs.sunshade.icu/shared-architecture/llms-full.txt\n`,
    ];

    for (const filePath of sharedFiles) {
      const raw = readFileSync(filePath, 'utf8');
      sections.push(cleanMdxContent(raw, filePath));
      sections.push('\n---\n');
    }

    return new Response(sections.join('\n\n').trim() + '\n', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // Case 2: Specific App Project request
  const appDir = join(rootDir, 'content', 'docs', 'apps', project);

  if (!existsSync(appDir)) {
    return new Response(
      `Project "${project}" not found.\n\nPlease refer to the root documentation catalog at https://docs.sunshade.icu/llms.txt for available projects.\n`,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }
    );
  }

  const appFiles = getMarkdownFiles(appDir);
  if (appFiles.length === 0) {
    return new Response(
      `Project "${project}" exists, but no documentation files (.md or .mdx) are currently registered.\n\nRun 'npm run sync-docs' to pull submodule content or check the repository docs folder.\n`,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }
    );
  }

  const sections: string[] = [
    `# SunShade Systems: ${project.toUpperCase()} Documentation Bundle`,
    `> Scoped context bundle combining ${project} application guides with shared architecture invariants.`,
    `> Generated from: docs.sunshade.icu/${project}/llms-full.txt\n`,
    `## Section 1: Application Guides (${project})\n`,
  ];

  for (const filePath of appFiles) {
    const raw = readFileSync(filePath, 'utf8');
    sections.push(cleanMdxContent(raw, filePath));
    sections.push('\n---\n');
  }

  sections.push(`\n## Section 2: Shared Platform Architecture & Invariants\n`);

  const sharedFiles = getMarkdownFiles(sharedArchDir);
  for (const filePath of sharedFiles) {
    const raw = readFileSync(filePath, 'utf8');
    sections.push(cleanMdxContent(raw, filePath));
    sections.push('\n---\n');
  }

  const bundledMarkdown = sections.join('\n\n').trim() + '\n';

  return new Response(bundledMarkdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
