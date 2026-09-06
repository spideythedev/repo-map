"use client";

import { useState } from "react";
import {
  ArrowRight,
  Folder,
  Github,
  GitBranch,
  Loader2,
  Search,
  X
} from "lucide-react";

type RepoFile = {
  path: string;
  type: string;
};

type RepoData = {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  files: RepoFile[];
};

function parseRepoUrl(value: string) {
  try {
    const url = new URL(value.trim());

    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, "")
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeRepository() {
    const parsed = parseRepoUrl(url);

    if (!parsed) {
      setError("Enter a valid public GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError("");
    setRepo(null);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`
      );

      if (!response.ok) {
        throw new Error("Repository not found.");
      }

      const repository = await response.json();

      const treeResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${repository.default_branch}?recursive=1`
      );

      if (!treeResponse.ok) {
        throw new Error("Unable to read repository tree.");
      }

      const tree = await treeResponse.json();

      setRepo({
        name: repository.name,
        full_name: repository.full_name,
        description: repository.description,
        default_branch: repository.default_branch,
        files: tree.tree
          .filter((item: RepoFile) => item.path)
          .map((item: RepoFile) => ({
            path: item.path,
            type: item.type
          }))
          .slice(0, 500)
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the repository."
      );
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setUrl("");
    setRepo(null);
    setError("");
  }

  return (
    <main>
      <header className="nav">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={17} />
          </div>
          <span>RepoMap</span>
        </div>

        <a
          className="github-link"
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} />
          GitHub
        </a>
      </header>

      {!repo ? (
        <section className="hero">
          <div className="eyebrow">
            <span />
            Repository intelligence
          </div>

          <h1>
            See how a
            <br />
            <em>codebase</em> connects.
          </h1>

          <p className="hero-copy">
            Paste a public GitHub repository and explore its structure as a
            visual codebase map.
          </p>

          <div className="search-box">
            <Search size={19} />

            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") analyzeRepository();
              }}
              placeholder="https://github.com/owner/repository"
              aria-label="GitHub repository URL"
            />

            {url && (
              <button className="clear-button" onClick={clear}>
                <X size={16} />
              </button>
            )}

            <button
              className="analyze-button"
              onClick={analyzeRepository}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="spin" />
                  Analyzing
                </>
              ) : (
                <>
                  Analyze
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="feature-row">
            <span>Structure</span>
            <span>Languages</span>
            <span>Dependencies</span>
            <span>Architecture</span>
          </div>
        </section>
      ) : (
        <section className="workspace">
          <div className="workspace-header">
            <div>
              <div className="repo-path">{repo.full_name}</div>
              <h2>{repo.name}</h2>
              {repo.description && <p>{repo.description}</p>}
            </div>

            <button className="new-analysis" onClick={clear}>
              New analysis
            </button>
          </div>

          <div className="map">
            <div className="map-center">
              <GitBranch size={24} />
              <strong>{repo.name}</strong>
              <small>{repo.files.length} items</small>
            </div>

            <div className="nodes">
              {repo.files.slice(0, 12).map((file, index) => (
                <div
                  className="node"
                  key={file.path}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <Folder size={16} />
                  <span>{file.path}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}