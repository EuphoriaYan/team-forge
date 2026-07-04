# Team Forge Initialization Design

## Goal

Initialize an implementable AI-native collaborative R&D platform project based on the prior discussion: code-centric truth, Code Graph projection, contract-first AI execution, action admission, and evidence closure.

## Architecture

The MVP uses a pnpm TypeScript monorepo. `packages/core` contains the domain model, event ledger, workspace projector, task context builder, and action admission gate. `apps/web` renders a restrained operations-style workspace that displays the six typed subspaces, code graph slice, admission state, and required evidence.

## Components

- Event Ledger: append-only engineering events.
- Workspace Projector: maps events into typed subspaces and trace chains.
- Action Admission: blocks forbidden actions and escalates out-of-radius changes.
- Task Context Package: bundles task, capability, code graph slice, reuse candidates, skills, evidence, and forbidden changes.
- Web Workspace: inspectable first surface for the Team Forge model.
- GitHub Assets: CI, PR evidence template, CODEOWNERS, Copilot instructions, and agent rules.

## Data Flow

Problem and architecture events are appended to the ledger. The projector turns those events into workspace views. Task context packages pull from contracts and code graph nodes. Admission decisions evaluate intended actions against path radius, tests, and risk signals. The UI renders the resulting model for human review.

## Error Handling

Unknown task or capability contracts throw explicit errors. Duplicate ledger events are rejected. Forbidden risk signals block the action and require security review. Out-of-radius changes are escalated to architecture review.

## Testing

Core behavior is covered with Vitest unit tests. The web workspace is covered with React Testing Library smoke tests that verify subspaces, code graph thesis, admission status, and evidence requirements.

