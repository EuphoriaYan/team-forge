# Core

`@team-forge/core` owns platform-independent engineering contracts and
decisions. It has no filesystem, Git provider, AI tool, or UI dependency.

| Module | Responsibility |
|---|---|
| `types.ts` | shared work, contract, context, workflow, and evidence types |
| `work-item.ts` | bug/feature/new-project source validation |
| `context.ts` | task context projection, persisted record creation, resume freshness |
| `workflow.ts` | role-isolated Standard, Compact, bug, and new-project sequencing |
| `admission.ts` | path, artifact, evidence, architecture, and human Gate decisions |
| `ledger.ts` | append-only engineering events |
| `projector.ts` | typed workspace views from events |
| `seed.ts` | stable MVP data for tests and the web surface |

Adapters may persist or render these contracts, but they must not silently
change their meaning.
