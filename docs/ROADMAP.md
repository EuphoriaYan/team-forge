# Roadmap

## Phase 1: Repository And PR Discipline

Goal: make AI work reviewable in GitHub.

- Add AGENTS and Claude adapter instructions.
- Add PR evidence template.
- Add CI for tests, typecheck, and build.
- Add contract templates.
- Keep MVP in one repo with a small TypeScript core and React surface.

Exit condition:

- Every PR can show task, contract, code graph impact, tests, risks, and review points.

## Phase 2: Skills And Hooks

Goal: move repeated practices out of prose and into callable workflows.

- `codegraph-locate`
- `existing-capability-survey`
- `reuse-first-plan`
- `minimal-change-plan`
- `contract-first-test`
- `change-radius-review`
- `reuse-gate-review`
- `simplicity-review`
- `evidence-pack`
- `agent-failure-retrospective`

Exit condition:

- Agents can consistently produce task context packages and evidence packages.

## Phase 3: Code Graph And Auto-Load

Goal: load the right context automatically.

- Build a code graph indexer.
- Attach requirement, ADR, evidence, and risk overlays.
- Generate task-specific code graph slices.
- Detect stale context and conflicting changes.

Exit condition:

- Each task starts with a versioned context package and a known change radius.

## Phase 4: AI Engineering Control Plane

Goal: coordinate humans and multiple AI agents across workstreams.

- Agent run ledger.
- Policy and gate service.
- Evidence board.
- Agent eval and evolution service.
- GitHub app integration.

Exit condition:

- The system can coordinate parallel AI work with consistent context, gates, evidence, and feedback loops.

