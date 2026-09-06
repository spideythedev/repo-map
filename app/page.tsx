"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Folder,
  Github,
  GitBranch,
  Loader2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw
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

type MapNode = {
  id: string;
  label: string;
  path: string;
  type: "root" | "folder" | "file";
  x: number;
  y: number;
  parent?: string;
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

function buildMap(files: RepoFile[], repoName: string) {
  const nodes: MapNode[] = [
    {
      id: "root",
      label: repoName,
      path: repoName,
      type: "root",
      x: 600,
      y: 400
    }
  ];

  const folders = new Map<string, string>();
  const visibleFiles = files.slice(0, 120);

  for (const file of visibleFiles) {
    const parts = file.path.split("/");

    let parent = "root";
    let depth = 0;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join("/");

      if (!folders.has(folderPath)) {
        const angle =
          (folders.size / Math.max(1, Math.min(12, visibleFiles.length))) *
          Math.PI *
          2;

        const radius = 170 + depth * 90;

        const id = `folder:${folderPath}`;

        nodes.push({
          id,
          label: parts[i],
          path: folderPath,
          type: "folder",
          x: 600 + Math.cos(angle) * radius,
          y: 400 + Math.sin(angle) * radius,
          parent
        });

        folders.set(folderPath, id);
      }

      parent = folders.get(folderPath)!;
      depth++;
    }

    const angle =
      (nodes.length / Math.max(1, visibleFiles.length)) * Math.PI * 2;

    const radius = 310;

    nodes.push({
      id: `file:${file.path}`,
      label: parts.at(-1) || file.path,
      path: file.path,
      type: "file",
      x: 600 + Math.cos(angle) * radius,
      y: 400 + Math.sin(angle) * radius,
      parent
    });
  }

  return nodes;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState<string | null>(null);

  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const nodes = useMemo(
    () => (repo ? buildMap(repo.files, repo.name) : []),
    [repo]
  );

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
        throw new Error("Repository not found or unavailable.");
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
      });

      setZoom(1);
      setOffset({ x: 0, y: 0 });
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

  function resetMap() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function clear() {
    setUrl("");
    setRepo(null);
    setError("");
    resetMap();
  }

  function startDrag(event: React.PointerEvent<SVGSVGElement>) {
    dragging.current = true;
    lastPoint.current = {
      x: event.clientX,
      y: event.clientY
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;

    const dx = event.clientX - lastPoint.current.x;
    const dy = event.clientY - lastPoint.current.y;

    lastPoint.current = {
      x: event.clientX,
      y: event.clientY
    };

    setOffset((current) => ({
      x: current.x + dx,
      y: current.y + dy
    }));
  }

  function stopDrag() {
    dragging.current = false;
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
            Paste a public GitHub repository and explore its structure as an
            interactive visual map.
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
            <span>Relationships</span>
            <span>Architecture</span>
            <span>Interactive map</span>
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

          <div className="map-shell">
            <div className="map-toolbar">
              <button
                onClick={() =>
                  setZoom((value) => Math.min(2.5, value + 0.15))
                }
                aria-label="Zoom in"
              >
                <ZoomIn size={17} />
              </button>

              <button
                onClick={() =>
                  setZoom((value) => Math.max(0.45, value - 0.15))
                }
                aria-label="Zoom out"
              >
                <ZoomOut size={17} />
              </button>

              <button onClick={resetMap} aria-label="Reset map">
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="map-info">
              <strong>{nodes.length}</strong>
              <span>mapped nodes</span>
            </div>

            <svg
              className="repo-map"
              viewBox="0 0 1200 800"
              onPointerDown={startDrag}
              onPointerMove={drag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              style={{ cursor: dragging.current ? "grabbing" : "grab" }}
            >
              <g
                transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}
              >
                {nodes
                  .filter((node) => node.parent)
                  .map((node) => {
                    const parent = nodes.find(
                      (item) => item.id === node.parent
                    );

                    if (!parent) return null;

                    const highlighted =
                      active === node.id || active === parent.id;

                    return (
                      <line
                        key={`line-${node.id}`}
                        x1={parent.x}
                        y1={parent.y}
                        x2={node.x}
                        y2={node.y}
                        className={`connection ${
                          highlighted ? "connection-active" : ""
                        }`}
                      />
                    );
                  })}

                {nodes.map((node, index) => {
                  const isActive = active === node.id;

                  return (
                    <g
                      key={node.id}
                      className={`map-node node-${node.type} ${
                        isActive ? "map-node-active" : ""
                      }`}
                      style={{
                        animationDelay: `${Math.min(index * 18, 600)}ms`
                      }}
                      onPointerEnter={() => setActive(node.id)}
                      onPointerLeave={() => setActive(null)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={
                          node.type === "root"
                            ? 48
                            : node.type === "folder"
                              ? 28
                              : 22
                        }
                      />

                      {node.type === "root" && (
                        <GitBranch
                          x={node.x - 10}
                          y={node.y - 28}
                          size={20}
                        />
                      )}

                      {node.type === "folder" && (
                        <Folder
                          x={node.x - 8}
                          y={node.y - 8}
                          size={16}
                        />
                      )}

                      <text
                        x={node.x}
                        y={
                          node.type === "root"
                            ? node.y + 70
                            : node.y + 43
                        }
                        textAnchor="middle"
                      >
                        {node.label.length > 25
                          ? `${node.label.slice(0, 22)}...`
                          : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </section>
      )}
    </main>
  );
}