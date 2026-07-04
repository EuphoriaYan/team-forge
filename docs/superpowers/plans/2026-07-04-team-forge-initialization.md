# Team Forge Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a GitHub-ready MVP for Team Forge.

**Architecture:** A pnpm monorepo with a tested TypeScript core and a React workspace app. Core behavior models events, projections, task context, and gates; the app visualizes the model.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, React, Vite, React Testing Library, GitHub Actions.

---

### Task 1: Workspace Skeleton

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [x] Create the pnpm monorepo configuration.
- [x] Add shared TypeScript strict settings.
- [x] Install dependencies and lock them with `pnpm-lock.yaml`.

### Task 2: Core Behavior

**Files:**
- Test: `packages/core/tests/harness.test.ts`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/ledger.ts`
- Create: `packages/core/src/projector.ts`
- Create: `packages/core/src/admission.ts`
- Create: `packages/core/src/context.ts`
- Create: `packages/core/src/seed.ts`
- Create: `packages/core/src/index.ts`

- [x] Write failing tests for ledger projection, forbidden admission, out-of-radius admission, and task context package.
- [x] Run tests and verify failure due to missing implementation.
- [x] Implement the minimal core model.
- [x] Run `pnpm --filter @team-forge/core test`.

### Task 3: Web Workspace

**Files:**
- Test: `apps/web/src/App.test.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/test/setup.ts`

- [x] Write failing tests for six subspaces, code graph projection, action admission, and evidence labels.
- [x] Run tests and verify failure due to missing implementation.
- [x] Implement the workspace app.
- [x] Run `pnpm --filter @team-forge/web test`.

### Task 4: GitHub-Ready Assets

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/pull_request_template.md`
- Create: `.github/copilot-instructions.md`
- Create: `.github/CODEOWNERS`
- Create: `AGENTS.md`
- Create: `CLAUDE.md`

- [x] Add repository instructions for AI agents.
- [x] Add PR evidence template.
- [x] Add CI for install, test, typecheck, and build.

### Task 5: Verification

**Files:**
- All repository files.

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Start the local dev server and inspect the UI.
- [ ] Configure GitHub remote after owner and visibility are confirmed.

