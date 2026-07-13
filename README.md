# Team Forge

Team Forge is an AI-native collaborative R&D workspace. It turns fast AI coding into a governed engineering loop: source code remains the first truth, the code graph becomes the first projection, and every important agent action is tied to contracts, change radius, and evidence.

## What This Initializes

- A pnpm monorepo with a TypeScript core package and React workspace app.
- Core domain primitives for engineering events, typed workspace projections, task context packages, and action admission gates.
- A visible MVP dashboard for six subspaces: problem definition, architecture contract, task execution, verification evidence, release operations, and agent evolution.
- GitHub-ready collaboration assets: CI, PR evidence template, CODEOWNERS, Copilot instructions, and agent guidance.
- Contract templates for capability contracts, verification contracts, and action admission reviews.
- First-wave enterprise SDD contracts for work identity, resumable context,
  Standard/Compact planning, human gates, and PR evidence admission.

## Repository Layout

```text
apps/web/              React workspace dashboard
packages/core/         Domain model, event ledger, projector, gate, context package
docs/                  Product brief, architecture, roadmap, implementation notes
.ai/contracts/         Capability, verification, and admission contract templates
.github/               CI, PR template, CODEOWNERS, Copilot instructions
AGENTS.md              Cross-agent working agreement
CLAUDE.md              Claude-specific adapter rules
```

## Local Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

The app runs through Vite at `http://localhost:5173` by default.

## AI Team Migration

The staged compatibility plan is documented in
[docs/AI-TEAM-MIGRATION.md](docs/AI-TEAM-MIGRATION.md). Team Forge adopts the
behavioral contracts behind the AI Team Spec Kit extension while keeping its
own event, projection, admission, and UI architecture.

## First Product Principle

Do not make humans chase every AI-generated line. Make AI work reviewable through intent, contracts, code graph slices, change radius, tests, and evidence packages.
