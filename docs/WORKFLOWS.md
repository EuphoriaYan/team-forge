# Governed Workflows

Team Forge models workflow sequencing separately from action admission:

- the workflow says which role acts next and which document crosses the role boundary;
- admission decides whether that action is allowed with the current contracts,
  path radius, artifacts, approvals, and evidence.

Both decisions must pass before an agent action runs.

## Existing-Project Bug Fix

```text
Context -> Impact -> Impact Review -> Assess -> Assessment Review
-> Permission Review -> Fix -> Fix Review -> Verify -> Evidence -> PR Review
```

A bug must have a coding issue. Multiple issues may share one fix only when
they are symptoms of the same root cause. This path does not require Feature
acceptance and does not force product-style Spec/Plan work onto a focused fix.

## Existing-Project Feature

```text
Context -> Impact -> Technical Committee Feature Acceptance
-> Specify [product] -> document handoff
-> Plan [architect] -> document handoff
-> Tasks + Implement [developer] -> Verify -> Evidence -> PR Review
```

The Product, Architect, and Developer roles exchange explicit artifacts. They
do not depend on hidden shared chat. A public feature uses a coding issue; a
confidential enterprise feature uses a sanitized handoff URL.

## Compact Feature

Compact is an explicit branch for eligible low-risk existing-project work. It
still writes separate Spec, Plan, and Tasks artifacts and preserves role
handoffs. The human reviewer first approves Compact eligibility, then reviews
Plan and Tasks together. A revise decision returns to Plan and repeats the
Plan-to-Tasks handoff.

## New Project

New-project work adds a bootstrap step before the normal feature path. It
always uses Standard planning so the architecture spine, dependency strategy,
runnable thin slice, verification approach, and release boundary are reviewed
before broad implementation.

## Human Gate Records

Every Gate transition requires a record with:

- exact gate ID;
- approved, revised, or rejected decision;
- accountable human identity;
- decision timestamp;
- optional rationale.

`revised` returns to the declared generation or analysis step and increments a
revision counter. `rejected` stops the run. The serializable workflow state
stores completed steps, revision counters, and Gate records so another tool or
session can resume without inheriting hidden conversation context.

## Current Boundary

The core workflow is executable and tested, but it is not yet a chat router or
agent runner. Provider adapters must still connect it to Codex, Claude Code,
Cursor, Trae, Git hosting, file artifacts, and concrete commands. Those
adapters must call admission before performing writes and persist the updated
workflow and Work Context records after each step.
