import type { EngineeringEvent, ForgeWorkspace } from "./types";

const seedEvents: EngineeringEvent[] = [
  {
    id: "evt-problem",
    type: "problem.defined",
    actor: "product-lead",
    at: "2026-07-04T08:00:00.000Z",
    payload: {
      problemId: "problem-ai-workspace-gap",
      title: "AI coding speed exceeds human review bandwidth",
      summary:
        "Teams need a shared workspace where AI work stays tied to intent, contracts, code graph context, and evidence."
    }
  },
  {
    id: "evt-capability",
    type: "capability.contracted",
    actor: "architect",
    at: "2026-07-04T08:05:00.000Z",
    payload: {
      capabilityId: "capability-context-gate",
      title: "Context-aware action admission",
      summary:
        "Every important AI action is checked against task scope, capability contracts, risk signals, and required evidence."
    }
  },
  {
    id: "evt-adr",
    type: "adr.recorded",
    actor: "architect",
    at: "2026-07-04T08:10:00.000Z",
    payload: {
      adrId: "adr-code-graph-first",
      title: "Use source code as first truth and Code Graph as first projection",
      summary:
        "Do not create a separate truth system. Project requirements, constraints, and evidence onto the code graph."
    }
  },
  {
    id: "evt-task",
    type: "task.created",
    actor: "workspace-orchestrator",
    at: "2026-07-04T08:15:00.000Z",
    payload: {
      taskId: "task-ai-workspace-mvp",
      title: "Initialize AI-native collaborative workspace MVP",
      summary:
        "Create the first project skeleton with core domain contracts, admission policy, context package, and visible workspace."
    }
  },
  {
    id: "evt-change",
    type: "change.proposed",
    actor: "coding-agent",
    at: "2026-07-04T08:20:00.000Z",
    payload: {
      changeId: "change-web-core-mvp",
      title: "Core model and workspace surface",
      summary:
        "Add TypeScript core package plus a React workspace that makes the harness concepts inspectable."
    }
  },
  {
    id: "evt-verification",
    type: "verification.contracted",
    actor: "qa-agent",
    at: "2026-07-04T08:25:00.000Z",
    payload: {
      verificationContractId: "verify-ai-workspace-mvp",
      title: "Contract and workspace verification",
      summary:
        "Core behavior must be covered by tests, and UI must expose subspaces, gate status, and evidence requirements."
    }
  }
];

export function createSeedWorkspace(): ForgeWorkspace {
  return {
    events: [...seedEvents],
    capabilityContracts: [
      {
        id: "capability-context-gate",
        title: "Context-aware action admission",
        goal: "Keep AI changes tied to contracts, allowed paths, tests, and explicit risk review.",
        inputs: ["ActionRequest", "TaskContract", "CapabilityContract", "CodeGraphSlice"],
        outputs: ["AdmissionDecision", "RequiredEvidence"],
        requiredSkills: ["codegraph-locate", "reuse-first-plan", "minimal-change-plan", "evidence-pack"],
        requiredEvidence: ["contract-tests", "human-architecture-review"],
        forbiddenChanges: ["Bypass audit or evidence recording", "Expand data access without review"],
        allowedPathPrefixes: ["packages/core/", "apps/web/", "docs/", ".github/"]
      }
    ],
    taskContracts: [
      {
        id: "task-ai-workspace-mvp",
        title: "Initialize AI-native collaborative workspace MVP",
        capabilityContractId: "capability-context-gate",
        allowedPathPrefixes: ["packages/core/", "apps/web/", "docs/", ".github/"],
        reuseCandidates: ["EventLedger", "WorkspaceProjector", "EvidenceBoard"],
        requiredEvidence: ["contract-tests", "ui-smoke-test", "human-architecture-review"],
        workItem: {
          workId: "feature-team-forge-mvp",
          workType: "feature",
          codingIssueUrl: "https://github.com/chaosxingxc-orion/team-forge/issues/1",
          alsoResolvesIssueUrls: []
        },
        planningMode: "standard",
        phase: "implementing",
        artifacts: {
          spec: "docs/superpowers/specs/2026-07-04-team-forge-design.md",
          plan: "docs/superpowers/plans/2026-07-04-team-forge-initialization.md",
          tasks: "docs/superpowers/plans/2026-07-04-team-forge-initialization.md",
          impactAnalysis: "docs/ARCHITECTURE.md"
        },
        gateRecords: [
          {
            gate: "spec-review",
            decision: "approved",
            decidedBy: "project-lead",
            decidedAt: "2026-07-04T08:11:00.000Z"
          },
          {
            gate: "plan-review",
            decision: "approved",
            decidedBy: "project-lead",
            decidedAt: "2026-07-04T08:12:00.000Z"
          },
          {
            gate: "tasks-review",
            decision: "approved",
            decidedBy: "project-lead",
            decidedAt: "2026-07-04T08:13:00.000Z"
          }
        ]
      }
    ],
    sourceSnapshot: "418306e9e142ca51c9f93246ef8187226e690065",
    codeGraphVersion: "seed-v1",
    codeGraph: [
      {
        id: "node-event-ledger",
        label: "EventLedger",
        kind: "service",
        path: "packages/core/src/ledger.ts",
        summary: "Append-only engineering event stream for problem, architecture, task, change, and evidence records."
      },
      {
        id: "node-workspace-projector",
        label: "WorkspaceProjector",
        kind: "module",
        path: "packages/core/src/projector.ts",
        summary: "Projects shared events into typed workspace subspaces and trace chains."
      },
      {
        id: "node-action-admission",
        label: "ActionAdmission",
        kind: "contract",
        path: "packages/core/src/admission.ts",
        summary: "Evaluates whether an AI action is allowed, needs review, or must be blocked."
      },
      {
        id: "node-evidence-board",
        label: "EvidenceBoard",
        kind: "view",
        path: "apps/web/src/App.tsx",
        summary: "Surfaces required evidence and gate decisions for human review."
      }
    ]
  };
}
