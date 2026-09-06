"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  Clock3,
  CodeXml,
  GitBranch,
  GitFork,
  Loader2,
  Search,
  Star,
  Users,
  X
} from "lucide-react";

import RepoMap from "./components/RepoMap";
import DetailsPanel from "./components/DetailsPanel";

type Analysis = {
  analyzedSourceFiles: number;
  truncatedTree: boolean;
  folders: number;
  fileCount: number;
  frameworks: string[];
  packageManager: string | null;
  entryPoints: string[];
  languages: {
    language: string;
    count: number;
  }[];
  largestFiles: {
    path: string;
    size: number;
  }[];
  hotspots: {
    path: string;
    connections: number;
  }[];
};

type RepoData = {
  repository: {
    name: string;
    fullName: string;
    url: string;
    description: string | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    issues: number;
    watchers: number;
    size: number;
    language: string | null;
    license: string | null;
    topics: string[];
    updatedAt: string;
    pushedAt: string;
    owner: string;
  };
  files: {
    path: string;
    size: number;
    type: string;
  }[];
  relationships: {
    from: string;
    to: string;
    type: "import";
  }[];
  analysis: Analysis;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: FormEvent) {
    event.preventDefault();

    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setRepo(null);
    setSelected(null);

    try {
      const response = await fetch(
        `/api/analyze?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed.");
      }

      setRepo(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze repository."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedRelationships = useMemo(
    () => repo?.relationships ?? [],
    [repo]
  );

  if (!repo) {
    return (
      <main className="landing">
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">
              <CodeXml size={19} />
            </span>
            RepoMap
          </div>

          <a
            className="github-link"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <section className="hero">
          <div className="eyebrow">
            <GitBranch size={14} />
            Repository intelligence
          </div>

          <h1>
            See how a
            <span> codebase connects.</span>
          </h1>

          <p className="hero-copy">
            Explore repository structure, discover real import
            relationships, and understand how the pieces of a
            codebase fit together.
          </p>

          <form className="search-box" onSubmit={analyze}>
            <Search size={19} />

            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              aria-label="GitHub repository URL"
            />

            {url && (
              <button
                type="button"
                className="clear-button"
                onClick={() => setUrl("")}
                aria-label="Clear repository URL"
              >
                <X size={17} />
              </button>
            )}

            <button
              className="analyze-button"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={17} />
                  Analyzing
                </>
              ) : (
                <>
                  Analyze
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="error">
              <CircleAlert size={17} />
              {error}
            </div>
          )}

          <div className="feature-row">
            <span>Real repository data</span>
            <span>Import analysis</span>
            <span>Interactive graph</span>
            <span>No repository upload</span>
          </div>
        </section>
      </main>
    );
  }

  const { repository, analysis } = repo;

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="workspace-brand">
          <div className="brand">
            <span className="brand-mark">
              <CodeXml size={18} />
            </span>
            RepoMap
          </div>

          <div className="repo-path">
            {repository.fullName}
          </div>
        </div>

        <a
          className="github-link"
          href={repository.url}
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub
          <ArrowRight size={15} />
        </a>
      </header>

      <section className="repo-summary">
        <div>
          <span className="eyebrow">
            <GitBranch size={14} />
            {repository.defaultBranch}
          </span>

          <h1>{repository.name}</h1>

          <p>
            {repository.description ||
              "No repository description provided."}
          </p>
        </div>

        <div className="repo-meta">
          <span>
            <Star size={15} />
            {formatNumber(repository.stars)}
          </span>

          <span>
            <GitFork size={15} />
            {formatNumber(repository.forks)}
          </span>

          <span>
            <Clock3 size={15} />
            {formatDate(repository.updatedAt)}
          </span>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>
            <CodeXml size={16} />
            Files
          </span>
          <strong>{formatNumber(analysis.fileCount)}</strong>
        </div>

        <div className="stat-card">
          <span>
            <GitBranch size={16} />
            Folders
          </span>
          <strong>{formatNumber(analysis.folders)}</strong>
        </div>

        <div className="stat-card">
          <span>
            <GitBranch size={16} />
            Imports
          </span>
          <strong>{formatNumber(repo.relationships.length)}</strong>
        </div>

        <div className="stat-card">
          <span>
            <Users size={16} />
            Issues
          </span>
          <strong>{formatNumber(repository.issues)}</strong>
        </div>
      </section>

      <section className="analysis-grid">
        <div className="analysis-card">
          <div className="card-heading">
            <div>
              <span className="card-label">Code intelligence</span>
              <h2>Detected architecture</h2>
            </div>
          </div>

          <div className="tag-list">
            {analysis.frameworks.length ? (
              analysis.frameworks.map((framework) => (
                <span className="tag" key={framework}>
                  {framework}
                </span>
              ))
            ) : (
              <span className="muted">
                No framework detected
              </span>
            )}

            {analysis.packageManager && (
              <span className="tag">
                {analysis.packageManager}
              </span>
            )}

            {repository.license && (
              <span className="tag">
                {repository.license}
              </span>
            )}
          </div>
        </div>

        <div className="analysis-card">
          <div className="card-heading">
            <div>
              <span className="card-label">Entry points</span>
              <h2>Where execution begins</h2>
            </div>
          </div>

          {analysis.entryPoints.length ? (
            <div className="compact-list">
              {analysis.entryPoints.map((entry) => (
                <button
                  key={entry}
                  onClick={() => setSelected(entry)}
                >
                  {entry}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">
              No common entry point detected.
            </p>
          )}
        </div>

        <div className="analysis-card">
          <div className="card-heading">
            <div>
              <span className="card-label">Dependency hotspots</span>
              <h2>Most connected files</h2>
            </div>
          </div>

          {analysis.hotspots.length ? (
            <div className="compact-list">
              {analysis.hotspots.map((hotspot) => (
                <button
                  key={hotspot.path}
                  onClick={() => setSelected(hotspot.path)}
                >
                  <span>{hotspot.path}</span>
                  <strong>{hotspot.connections}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">
              No local dependency relationships detected.
            </p>
          )}
        </div>

        <div className="analysis-card">
          <div className="card-heading">
            <div>
              <span className="card-label">Languages</span>
              <h2>Repository composition</h2>
            </div>
          </div>

          <div className="language-list">
            {analysis.languages.slice(0, 6).map((item) => (
              <div key={item.language}>
                <span>{item.language}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="map-section">
        <div className="map-header">
          <div>
            <span className="card-label">Codebase map</span>
            <h2>Repository relationships</h2>
          </div>

          <div className="map-search">
            <Search size={16} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search files..."
              aria-label="Search repository files"
            />
          </div>
        </div>

        {analysis.truncatedTree && (
          <div className="analysis-warning">
            <CircleAlert size={16} />
            GitHub returned a truncated repository tree. The map
            represents the files GitHub made available.
          </div>
        )}

        <RepoMap
          files={repo.files}
          relationships={repo.relationships}
          search={search}
          onSelect={setSelected}
        />
      </section>

      <section className="developer-grid">
        <div className="analysis-card">
          <BookOpen size={18} />
          <h2>Analysis coverage</h2>
          <p>
            {analysis.analyzedSourceFiles} source files were
            inspected for local import relationships.
          </p>
        </div>

        <div className="analysis-card">
          <Clock3 size={18} />
          <h2>Last pushed</h2>
          <p>{formatDate(repository.pushedAt)}</p>
        </div>
      </section>

      <DetailsPanel
        path={selected}
        files={repo.files}
        relationships={selectedRelationships}
        repoUrl={repository.url}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}