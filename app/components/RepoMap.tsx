"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileCode2,
  Folder,
  GitBranch,
  Maximize2,
  Minus,
  Plus,
  RotateCcw
} from "lucide-react";

type FileItem = {
  path: string;
  size: number;
  type: string;
};

type Relationship = {
  from: string;
  to: string;
  type: "import";
};

type Props = {
  files: FileItem[];
  relationships: Relationship[];
  search: string;
  onSelect: (path: string) => void;
};

type Node = {
  id: string;
  label: string;
  type: "folder" | "file";
  x: number;
  y: number;
};

function getParent(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function buildNodes(files: FileItem[]) {
  const folders = new Set<string>();

  for (const file of files) {
    const parts = file.path.split("/");
    parts.pop();

    for (let i = 1; i <= parts.length; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }

  const folderList = [...folders].sort(
    (a, b) => a.split("/").length - b.split("/").length
  );

  const nodes: Node[] = [];

  const folderWidth = 220;
  const fileWidth = 190;

  folderList.forEach((folder, index) => {
    const depth = folder.split("/").length;

    nodes.push({
      id: folder,
      label: folder.split("/").at(-1) ?? folder,
      type: "folder",
      x: 100 + depth * folderWidth,
      y: 100 + index * 75
    });
  });

  files.forEach((file, index) => {
    nodes.push({
      id: file.path,
      label: file.path.split("/").at(-1) ?? file.path,
      type: "file",
      x: 720 + (index % 4) * fileWidth,
      y: 90 + Math.floor(index / 4) * 90
    });
  });

  return nodes;
}

export default function RepoMap({
  files,
  relationships,
  search,
  onSelect
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });

  const nodes = useMemo(
    () => buildNodes(files.slice(0, 100)),
    [files]
  );

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const visibleNodes = nodes.filter((node) => {
    if (!normalizedSearch) return true;

    return (
      node.id.toLowerCase().includes(normalizedSearch) ||
      node.label.toLowerCase().includes(normalizedSearch)
    );
  });

  const visibleIds = new Set(visibleNodes.map((node) => node.id));

  const visibleRelationships = relationships.filter(
    (relationship) =>
      nodeMap.has(relationship.from) &&
      nodeMap.has(relationship.to) &&
      (!normalizedSearch ||
        visibleIds.has(relationship.from) ||
        visibleIds.has(relationship.to))
  );

  function zoomIn() {
    setZoom((value) => Math.min(value + 0.15, 2.5));
  }

  function zoomOut() {
    setZoom((value) => Math.max(value - 0.15, 0.45));
  }

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function startDrag(event: React.PointerEvent<SVGSVGElement>) {
    setDragging(true);
    dragStart.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y
    };
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;

    setOffset({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y
    });
  }

  function stopDrag() {
    setDragging(false);
  }

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <button onClick={zoomIn} aria-label="Zoom in">
          <Plus size={17} />
        </button>

        <button onClick={zoomOut} aria-label="Zoom out">
          <Minus size={17} />
        </button>

        <button onClick={reset} aria-label="Reset map">
          <RotateCcw size={16} />
        </button>

        <button
          onClick={() => setZoom(0.7)}
          aria-label="Fit map"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="map-info">
        <strong>{visibleNodes.length}</strong>
        <span>nodes</span>
        <span>·</span>
        <strong>{visibleRelationships.length}</strong>
        <span>imports</span>
      </div>

      <svg
        className="repo-map"
        viewBox="0 0 1400 850"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        style={{
          cursor: dragging ? "grabbing" : "grab"
        }}
      >
        <g
          transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}
        >
          {visibleRelationships.map((relationship) => {
            const from = nodeMap.get(relationship.from);
            const to = nodeMap.get(relationship.to);

            if (!from || !to) return null;

            return (
              <line
                key={`${relationship.from}-${relationship.to}`}
                className="connection connection-active"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            );
          })}

          {visibleNodes.map((node, index) => (
            <g
              key={node.id}
              className={`map-node ${
                normalizedSearch ? "map-node-search" : ""
              }`}
              style={{
                animationDelay: `${Math.min(index * 18, 700)}ms`
              }}
              onClick={() => onSelect(node.id)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.type === "folder" ? 25 : 22}
              />

              {node.type === "folder" ? (
                <foreignObject
                  x={node.x - 10}
                  y={node.y - 10}
                  width="20"
                  height="20"
                >
                  <Folder size={20} />
                </foreignObject>
              ) : (
                <foreignObject
                  x={node.x - 9}
                  y={node.y - 9}
                  width="18"
                  height="18"
                >
                  <FileCode2 size={18} />
                </foreignObject>
              )}

              <text
                x={node.x}
                y={node.y + 43}
                textAnchor="middle"
              >
                {node.label.length > 25
                  ? `${node.label.slice(0, 22)}…`
                  : node.label}
              </text>

              {node.type === "file" && (
                <text
                  className="node-path"
                  x={node.x}
                  y={node.y + 59}
                  textAnchor="middle"
                >
                  {getParent(node.id)}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>

      <div className="map-legend">
        <span>
          <GitBranch size={14} />
          Import relationship
        </span>
        <span>
          <Folder size={14} />
          Folder
        </span>
        <span>
          <FileCode2 size={14} />
          Source file
        </span>
      </div>
    </div>
  );
}