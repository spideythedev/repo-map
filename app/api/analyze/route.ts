import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";
const MAX_SOURCE_FILES = 60;

type GitHubTreeItem = {
  path: string;
  type: string;
  size?: number;
};

type Repository = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  language: string | null;
  license: {
    spdx_id: string | null;
    name: string;
  } | null;
  topics?: string[];
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
  };
};

const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".css",
  ".scss",
  ".vue",
  ".svelte"
]);

const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  "__pycache__"
]);

function headers() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoMap"
  };
}

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: headers(),
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    const message =
      response.status === 403
        ? "GitHub API rate limit reached. Try again later."
        : response.status === 404
          ? "Repository not found or is not public."
          : `GitHub returned ${response.status}.`;

    throw new Error(message);
  }

  return response.json();
}

function extension(path: string) {
  const match = path.match(/\.[^./]+$/);
  return match?.[0].toLowerCase() ?? "";
}

function isSourceFile(path: string) {
  return sourceExtensions.has(extension(path));
}

function isIgnored(path: string) {
  return path
    .split("/")
    .some((part) => ignoredDirectories.has(part));
}

function resolveImport(from: string, imported: string, files: Set<string>) {
  if (!imported.startsWith(".")) {
    return null;
  }

  const fromParts = from.split("/");
  fromParts.pop();

  const target = [...fromParts, ...imported.split("/")];

  const normalized: string[] = [];

  for (const part of target) {
    if (!part || part === ".") continue;

    if (part === "..") {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }

  const base = normalized.join("/");

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.py`,
    `${base}.go`,
    `${base}.rs`,
    `${base}.java`,
    `${base}.vue`,
    `${base}.svelte`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}/index.tsx`,
    `${base}/index.py`
  ];

  return candidates.find((candidate) => files.has(candidate)) ?? null;
}

function extractImports(content: string, path: string, files: Set<string>) {
  const imports = new Set<string>();

  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
    /from\s+["']([^"']+)["']/g
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(content))) {
      const imported = match[1];

      const resolved = resolveImport(path, imported, files);

      if (resolved && resolved !== path) {
        imports.add(resolved);
      }
    }
  }

  return [...imports];
}

function detectFrameworks(files: string[]) {
  const names = new Set<string>();

  const joined = files.join("\n");

  if (files.some((file) => file === "next.config.js" || file === "next.config.ts")) {
    names.add("Next.js");
  }

  if (
    files.some(
      (file) =>
        file === "vite.config.js" ||
        file === "vite.config.ts" ||
        file === "vite.config.mjs"
    )
  ) {
    names.add("Vite");
  }

  if (files.some((file) => file.includes("angular.json"))) {
    names.add("Angular");
  }

  if (files.some((file) => file === "nuxt.config.ts")) {
    names.add("Nuxt");
  }

  if (joined.includes(".tsx")) {
    names.add("React");
  }

  if (joined.includes(".vue")) {
    names.add("Vue");
  }

  if (joined.includes(".svelte")) {
    names.add("Svelte");
  }

  if (files.some((file) => file.endsWith(".py"))) {
    if (files.some((file) => file === "manage.py")) {
      names.add("Django");
    }

    if (files.some((file) => file === "app.py")) {
      names.add("Python");
    }
  }

  return [...names];
}

function detectPackageManager(files: string[]) {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "Yarn";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "Bun";
  if (files.includes("package-lock.json")) return "npm";
  if (files.includes("poetry.lock")) return "Poetry";
  if (files.includes("Pipfile.lock")) return "Pipenv";
  if (files.includes("Cargo.lock")) return "Cargo";

  return null;
}

function detectEntryPoints(files: string[]) {
  const candidates = [
    "app/page.tsx",
    "app/page.jsx",
    "app/page.js",
    "pages/index.tsx",
    "pages/index.jsx",
    "pages/index.js",
    "src/main.ts",
    "src/main.tsx",
    "src/main.js",
    "src/index.ts",
    "src/index.tsx",
    "src/index.js",
    "index.ts",
    "index.tsx",
    "index.js",
    "main.py",
    "app.py",
    "manage.py"
  ];

  return candidates.filter((file) => files.includes(file));
}

function languageBreakdown(files: string[]) {
  const counts = new Map<string, number>();

  for (const file of files) {
    const ext = extension(file);

    const language =
      ext === ".ts" || ext === ".tsx"
        ? "TypeScript"
        : ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs"
          ? "JavaScript"
          : ext === ".py"
            ? "Python"
            : ext === ".go"
              ? "Go"
              : ext === ".rs"
                ? "Rust"
                : ext === ".java" || ext === ".kt"
                  ? "JVM"
                  : ext === ".css" || ext === ".scss"
                    ? "CSS"
                    : ext === ".vue"
                      ? "Vue"
                      : ext === ".svelte"
                        ? "Svelte"
                        : null;

    if (language) {
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language, count]) => ({
      language,
      count
    }));
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Repository URL is required." },
        { status: 400 }
      );
    }

    const parsed = new URL(url);

    if (parsed.hostname !== "github.com") {
      return NextResponse.json(
        { error: "Please provide a GitHub repository URL." },
        { status: 400 }
      );
    }

    const parts = parsed.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length !== 2) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL." },
        { status: 400 }
      );
    }

    const [owner, repo] = parts;

    const repository = await github<Repository>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );

    const tree = await github<{
      tree: GitHubTreeItem[];
      truncated: boolean;
    }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(
        repository.default_branch
      )}?recursive=1`
    );

    const files = tree.tree
      .filter((item) => item.type === "blob")
      .filter((item) => !isIgnored(item.path))
      .map((item) => ({
        path: item.path,
        size: item.size ?? 0,
        type: "file"
      }));

    const fileSet = new Set(files.map((file) => file.path));

    const sourceFiles = files
      .filter((file) => isSourceFile(file.path))
      .slice(0, MAX_SOURCE_FILES);

    const relationships: {
      from: string;
      to: string;
      type: "import";
    }[] = [];

    await Promise.all(
      sourceFiles.map(async (file) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
            repository.default_branch
          )}/${file.path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`;

          const response = await fetch(rawUrl, {
            next: { revalidate: 60 }
          });

          if (!response.ok) return;

          const content = await response.text();

          const imports = extractImports(
            content,
            file.path,
            fileSet
          );

          for (const target of imports) {
            relationships.push({
              from: file.path,
              to: target,
              type: "import"
            });
          }
        } catch {
          // A single unreadable source file should not break the analysis.
        }
      })
    );

    const directories = new Set<string>();

    for (const file of files) {
      const parts = file.path.split("/");

      parts.pop();

      for (let i = 1; i <= parts.length; i++) {
        directories.add(parts.slice(0, i).join("/"));
      }
    }

    const largestFiles = [...files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    const dependencyCounts = new Map<string, number>();

    for (const relationship of relationships) {
      dependencyCounts.set(
        relationship.to,
        (dependencyCounts.get(relationship.to) ?? 0) + 1
      );
    }

    const hotspots = [...dependencyCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, connections]) => ({
        path,
        connections
      }));

    return NextResponse.json({
      repository: {
        name: repository.name,
        fullName: repository.full_name,
        url: repository.html_url,
        description: repository.description,
        defaultBranch: repository.default_branch,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        issues: repository.open_issues_count,
        watchers: repository.watchers_count,
        size: repository.size,
        language: repository.language,
        license: repository.license?.spdx_id ?? repository.license?.name ?? null,
        topics: repository.topics ?? [],
        updatedAt: repository.updated_at,
        pushedAt: repository.pushed_at,
        owner: repository.owner.login
      },
      files,
      relationships,
      analysis: {
        analyzedSourceFiles: sourceFiles.length,
        truncatedTree: tree.truncated,
        folders: directories.size,
        fileCount: files.length,
        frameworks: detectFrameworks(files.map((file) => file.path)),
        packageManager: detectPackageManager(files.map((file) => file.path)),
        entryPoints: detectEntryPoints(files.map((file) => file.path)),
        languages: languageBreakdown(files.map((file) => file.path)),
        largestFiles,
        hotspots
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze repository."
      },
      { status: 500 }
    );
  }
}