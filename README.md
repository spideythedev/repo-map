# RepoMap

> See how a codebase connects.

RepoMap is a small developer tool that helps you understand how a GitHub repository is put together.

Paste a public GitHub repository URL and RepoMap analyzes the codebase, maps its structure, and shows how files are connected through imports.

## Demo

https://repo-map-five.vercel.app

## What it does

- Explore the repository structure
- See folders and source files visually
- Detect real import relationships
- See which files depend on each other
- Search through the repository map
- Inspect individual files
- View languages used in the project
- Detect frameworks and package managers
- Identify common entry points
- Find dependency hotspots
- Open files directly on GitHub

Everything is generated from the actual repository. No fake or demo repository data.

## How it works

RepoMap fetches the public repository tree from GitHub, reads relevant source files, analyzes their imports, and turns that information into a visual map.

The basic idea is simple:

    GitHub Repository
           ↓
    Repository Tree
           ↓
      Source Files
           ↓
      Import Analysis
           ↓
      Repository Map

So instead of just looking at a folder tree, you can actually see how the code is connected.

## Tech

- Next.js
- React
- TypeScript
- Lucide
- GitHub API
- SVG

## Running locally

    git clone https://github.com/spideythedev/repo-map.git
    cd repo-map
    npm install
    npm run dev

Then open:

    http://localhost:3000

## Notes

RepoMap currently works with public GitHub repositories.

Large repositories are intentionally limited during source analysis to keep the experience fast and avoid unnecessary API requests.

## Why I built it

When jumping into an unfamiliar codebase, the hardest part isn't finding the files.

It's understanding how everything fits together.

RepoMap is my attempt to make that first look at a repository a little easier.

---

Built by Fahad Malik.