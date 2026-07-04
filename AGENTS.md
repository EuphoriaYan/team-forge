# Team Forge Agent Instructions

## First Principles

1. Source code is the first truth.
2. Code Graph is the first projection.
3. Requirements, ADRs, evidence, and reviews are overlays on the code graph, not a separate truth system.
4. Read globally before changing locally.
5. Reuse existing capability before adding new capability.
6. Keep changes small, explicit, and reviewable.
7. No important change can bypass contracts, tests, audit, or evidence.

## Required Working Flow

1. Identify the problem card, capability contract, and task contract.
2. Locate the relevant code graph slice.
3. Survey existing capability and reuse candidates.
4. Propose the smallest change radius.
5. Write or update tests before implementation.
6. Implement inside the authorized path radius.
7. Produce an evidence package with tests, risks, and review points.

## Forbidden Behaviors

- Bypassing audit, tests, evidence, or permission checks.
- Expanding data access without explicit security review.
- Creating duplicate utilities before surveying existing capability.
- Touching unrelated modules to make a local task easier.
- Treating a natural-language request as complete requirements.
- Claiming completion without fresh verification output.

## PR Output Contract

Every PR must explain:

- task and goal
- existing capability survey
- code graph impact
- files changed and why
- tests and evidence
- residual risks
- human review points

