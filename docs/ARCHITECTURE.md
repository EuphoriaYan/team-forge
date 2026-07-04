# Architecture

## System Model

Team Forge is organized around a small set of composable primitives:

```mermaid
flowchart LR
  Problem["Problem Card"] --> Capability["Capability Contract"]
  Capability --> ADR["ADR"]
  ADR --> Task["Task Contract"]
  Task --> Change["Change Set"]
  Change --> Verify["Verification Contract"]
  Verify --> Evidence["Evidence Package"]
  Evidence --> Evolution["Agent Evolution Sample"]
```

## Current Packages

`packages/core` owns the domain model:

- `ledger.ts`: append-only event ledger
- `projector.ts`: converts events into typed workspace subspaces
- `admission.ts`: evaluates agent action risk and review requirements
- `context.ts`: builds a task context package from task contracts and code graph slices
- `seed.ts`: stable seed workspace for MVP and UI development

`apps/web` owns the first workspace surface:

- six typed subspaces
- code graph projection panel
- task context package strip
- action admission and evidence panel

## Design Choices

- Code-centric: source code remains first truth.
- Projection-based: workspace views are projections of typed events and graph overlays.
- Contract-first: AI actions are checked against explicit task and capability contracts.
- Reuse-first: task context includes reuse candidates before implementation starts.
- Evidence-first: completion is measured by evidence packages, not code changes alone.

## Later Architecture

The current in-memory seed model should evolve into:

- Code Graph Service
- Task Context Service
- Agent Run Ledger
- Policy & Gate Service
- Evidence Board
- Skill Registry
- Hook Runtime
- Agent Eval & Evolution Service

