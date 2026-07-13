# AI Team Capability Migration

## Purpose

This document maps the enterprise SDD capabilities proven in the AI Team
Spec Kit extension into Team Forge's native control-plane model. The goal is
behavioral compatibility, not copying Spec Kit's command tree or file layout.

Team Forge already has the right core seams: typed contracts, an event ledger,
workspace projections, task context, action admission, and an evidence-facing
UI. Migration should strengthen those seams one wave at a time.

## Source Assessment

The upstream snapshot analyzed for this migration is
`chaosxingxc-orion/team-forge@418306e9e142ca51c9f93246ef8187226e690065`.
It is a small TypeScript/React MVP with six passing baseline tests. Its current
Code Graph is seeded rather than generated, its ledger is in memory, and its
admission gate checks path radius, declared tests, and a few forbidden risk
signals.

GitHub reports no repository license. Do not copy implementation code from
another project into Team Forge or redistribute a derived release until the
repository owner clarifies the license. The migration below is an independent
implementation of engineering concepts and contracts.

## Migration Principles

1. Extend Team Forge primitives instead of creating a second truth system.
2. Keep Spec, Plan, Tasks, source, tests, and evidence authoritative for their
   own concerns.
3. Store workflow facts as typed state and events; render files and UI as
   adapters or projections.
4. Keep human decisions explicit. AI may recommend but cannot invent approval.
5. Add one executable contract with tests before adding its chat command or UI.

## Capability Matrix

| AI Team capability | Team Forge destination | Decision | Status |
|---|---|---|---|
| Plain-language routing | workflow router over Work Item types | adapt | planned |
| Bug, feature, new-project identity | `WorkItemReference` | direct | implemented |
| Primary and same-root-cause issue links | work-item validator | direct | implemented |
| Public issue or confidential handoff URL | `WorkItemReference` | direct | implemented |
| Durable Work Context Package | typed task context plus persistence adapter | adapt | file default implemented |
| Cross-session resume | persisted context plus freshness decision | adapt | first implementation |
| Source snapshot and Code Graph version | `TaskContextPackage` | direct | implemented |
| Task-specific Code Graph slice | path-radius graph projection | adapt | first slice implemented |
| Code Graph generator/adapters | Code Graph service port | adapt | planned |
| Impact analysis and architecture review | admission signals and human gate records | direct | implemented |
| Standard SDD | workflow definition and role handoffs | adapt | core workflow implemented |
| Compact Plan/Tasks | workflow branch with explicit human gates | adapt | core workflow implemented |
| Role-isolated contexts | phase handoff artifacts and scoped reads | adapt | core contract implemented |
| Permission Envelope | policy/adaptor contract around admitted actions | adapt | planned |
| Self-test and Evidence Board | verification and evidence services | direct | PR gate implemented |
| Portable checks | check runner adapter that writes evidence | adapt | planned |
| PR and independent review | Git provider adapter plus evidence projection | adapt | planned |
| Three-tier memory | Memory port with file default and optional remote adapter | adapt | planned |
| Retrospective and release archive | evolution/release event processors | direct | planned |
| Skills and multi-tool installation | Skill Registry and integration adapters | adapt | planned |
| Private-requirement content fetch | bounded handoff adapter; never ledger raw secrets | adapt | planned |

## Wave 1: Identity, Context, Admission

Wave 1 makes the existing core safe enough to host later workflows:

- stable work ID and type;
- coding issue, same-root-cause issues, and confidential handoff references;
- Standard or Compact planning mode;
- current phase, artifact inventory, and human gate records;
- source and Code Graph versions in the context package;
- graph slicing from the authorized path radius instead of hard-coded nodes;
- blocked admission for unknown contracts, missing SDD artifacts, missing human
  gates, missing PR evidence, and unreviewed architecture-sensitive changes.

These checks are repository-independent. A future file, database, MCP, or SaaS
implementation must preserve the same inputs and decisions.

## Next Waves

### Wave 2: Persistent Work Context And Resume

- define context and storage ports (implemented);
- ship a local file adapter as the default (implemented);
- reconstruct the next action from persisted state (implemented for gate/action);
- reject stale source or graph snapshots until impact is refreshed (implemented);
- expose resume by work ID, issue URL, or workflow run ID.

### Wave 3: Workflow Runtime

- plain-language Intake with a reviewed issue draft;
- separate bug-fix and feature/new-project workflows (core implemented);
- Standard and Compact branches (core implemented);
- revise loops that repeat until approve or reject (core implemented);
- role-isolated Specify, Plan, Tasks, and Implement handoffs (contract implemented);
- connect provider commands and artifact writers to the core workflow.

### Wave 4: Code Graph And Evidence

- generator and adapter ports;
- graph edges, callers, callees, contracts, tests, and ownership overlays;
- expected-versus-actual change-radius comparison;
- portable test runner and Evidence Board persistence;
- PR provider integration and independent review view.

### Wave 5: Skills, Knowledge, Memory, Evolution

- integration installers for Codex, Claude Code, Cursor, and Trae;
- project Knowledge slices backed by source and Code Graph;
- local, department, and enterprise Memory adapters;
- failed-run retrospective and release-scoped consolidation;
- promotion of repeated lessons into skills, gates, tests, or knowledge.

## Features Not To Copy Directly

- Spec Kit CLI internals and extension packaging are integration concerns, not
  Team Forge domain objects.
- Markdown commands are not a workflow engine.
- Seeded Code Graph nodes are demo data, not a production graph service.
- Hidden chat history is not durable context or approval evidence.
- A policy-only permission statement must not claim operating-system sandbox
  enforcement.

## Verification Strategy

Each wave must add contract tests for permitted, review-required, and blocked
paths. End-to-end verification will eventually cover four user journeys:

1. existing-project bug fix;
2. existing-project feature, including confidential handoff;
3. new project from zero;
4. resume after interruption at every human gate.
