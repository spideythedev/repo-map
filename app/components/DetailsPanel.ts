"use client";

import {
  Check,
  Copy,
  ExternalLink,
  FileCode2,
  Folder,
  X
} from "lucide-react";
import { useState } from "react";

type Props = {
  path: string | null;
  files: {
    path: string;
    size: number;
  }[];
  relationships: {
    from: string;
    to: string;
  }[];
  repoUrl: string;
  onClose: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DetailsPanel({
  path,
  files,
  relationships,
  repoUrl,
  onClose
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!path) return null;

  const file = files.find((item) => item.path === path);
  const isFolder = !file;

  const incoming = relationships.filter(
    (relationship) => relationship.to === path
  );

  const outgoing = relationships.filter(
    (relationship) => relationship.from === path
  );

  async function copyPath() {
    await navigator.clipboard.writeText(path);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  const githubUrl = `${repoUrl}/blob/HEAD/${path}`;

  return (
    <aside className="details-panel">
      <div className="details-header">
        <div>
          <span className="details-eyebrow">Selected</span>
          <h3>{path.split("/").at(-1)}</h3>
        </div>

        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="details-type">
        {isFolder ? <Folder size={17} /> : <FileCode2 size={17} />}
        {isFolder ? "Directory" : "Source file"}
      </div>

      <div className="detail-block">
        <span>Path</span>
        <strong>{path}</strong>
      </div>

      {file && (
        <div className="detail-block">
          <span>Size</span>
          <strong>{formatBytes(file.size)}</strong>
        </div>
      )}

      <div className="detail-actions">
        <button onClick={copyPath}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy path"}
        </button>

        {!isFolder && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            GitHub
          </a>
        )}
      </div>

      {!isFolder && (
        <>
          <div className="relationship-section">
            <div className="relationship-title">
              Imports <strong>{outgoing.length}</strong>
            </div>

            {outgoing.length === 0 ? (
              <p className="muted">No local imports detected.</p>
            ) : (
              outgoing.map((relationship) => (
                <div
                  className="relationship-item"
                  key={`${relationship.from}-${relationship.to}`}
                >
                  {relationship.to}
                </div>
              ))
            )}
          </div>

          <div className="relationship-section">
            <div className="relationship-title">
              Imported by <strong>{incoming.length}</strong>
            </div>

            {incoming.length === 0 ? (
              <p className="muted">Nothing imports this file.</p>
            ) : (
              incoming.map((relationship) => (
                <div
                  className="relationship-item"
                  key={`${relationship.from}-${relationship.to}`}
                >
                  {relationship.from}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}