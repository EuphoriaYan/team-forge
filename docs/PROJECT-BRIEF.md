# Team Forge Project Brief

## Background

The source discussion converged on a practical problem: AI can produce code faster than humans can inspect every line, while humans often cannot fully specify requirements upfront. A team using multiple AI assistants needs a shared engineering control plane, not more ad hoc chat and documents.

## Core Thesis

Team Forge is a code-centric AI collaboration workspace. It treats source code as the first truth and Code Graph as the first projection. Requirements, constraints, ADRs, tests, evidence, and agent-learning records are overlays on that graph.

## Product Shape

The workspace is one shared mother space with typed subspaces:

- Problem Definition: problem cards, assumptions, goals, non-goals, risks.
- Architecture Contract: capability contracts, ADRs, domain boundaries, service contracts.
- Task Execution: task graph, branches, change sets, agent runs.
- Verification Evidence: unit, integration, E2E, evals, logs, screenshots, evidence packages.
- Release Operations: rollout plans, monitoring, rollback, incidents, operational feedback.
- Agent Evolution: failure samples, rules, skills, prompts, replay records, eval improvements.

## Key Engineering Objects

- Problem Card
- Capability Contract
- Architecture Decision Record
- Task Contract / Task Graph
- Change Set
- Verification Contract
- Evidence Package
- Evolution Sample

## MVP Scope

This repository initializes the first testable MVP:

- typed domain model
- append-only event ledger
- workspace projector
- action admission gate
- task context package
- visible React workspace
- GitHub CI and PR evidence workflow

## Non-Goals

- No production database yet.
- No real GitHub app integration yet.
- No authentication or organization model yet.
- No full code graph indexer yet.
- No multi-agent runtime yet.

Those belong in later milestones after the core contracts are stable.

