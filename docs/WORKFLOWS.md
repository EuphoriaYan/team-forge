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
- workflow, run, and work-item identity;
- the authority declared by that Gate;
- approved, revised, or rejected decision;
- accountable human identity;
- decision timestamp;
- optional rationale.

`revised` returns to the declared generation or analysis step and increments a
revision counter. `rejected` stops the run. Gate records from another run or
the wrong authority are rejected.

The serializable workflow state stores completed steps, revision counters, and
Gate records. `createWorkflowCheckpointEvent` writes that state through the
existing engineering event ledger, and `projectTaskContractFromWorkflow`
projects the same Gate facts into the Task Contract consumed by admission.
The Work Context record persists the checkpoint so another tool or session can
resume without inheriting hidden conversation context.

## Current Boundary

The core workflow is executable and tested, but it is not yet a chat router or
agent runner. Provider adapters must still connect it to Codex, Claude Code,
Cursor, Trae, Git hosting, organizational identity, file artifacts, and
concrete commands. An identity adapter is responsible for proving that a human
belongs to the declared Gate authority before constructing the record. After
each step, adapters checkpoint the workflow, project the Task Contract, run
admission before writes, and persist the updated Work Context.
