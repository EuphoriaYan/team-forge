import { describe, expect, test } from "vitest";
import {
  buildTaskContextPackage,
  createEventLedger,
  createSeedWorkspace,
  evaluateActionAdmission,
  projectWorkspace
} from "../src/index";

describe("team forge core harness", () => {
  test("projects append-only engineering events into typed workspace views", () => {
    const workspace = createSeedWorkspace();
    const ledger = createEventLedger(workspace.events);

    ledger.append({
      id: "evt-extra-evidence",
      type: "evidence.recorded",
      actor: "qa-agent",
      at: "2026-07-04T08:30:00.000Z",
      payload: {
        evidenceId: "evidence-contract-tests",
        verificationContractId: "verify-ai-workspace-mvp",
        title: "Contract-first tests",
        status: "passed",
        artifacts: ["packages/core/tests/harness.test.ts"],
        risks: []
      }
    });

    const projection = projectWorkspace(ledger.list());

    expect(projection.subspaces.problem.items).toHaveLength(1);
    expect(projection.subspaces.architecture.items).toHaveLength(2);
    expect(projection.subspaces.evidence.items.map((item) => item.id)).toContain(
      "evidence-contract-tests"
    );
    expect(projection.traceChain).toEqual([
      "problem-ai-workspace-gap",
      "capability-context-gate",
      "adr-code-graph-first",
      "task-ai-workspace-mvp",
      "change-web-core-mvp",
      "verify-ai-workspace-mvp"
    ]);
  });

  test("blocks forbidden actions and surfaces the smallest useful review reason", () => {
    const workspace = createSeedWorkspace();

    const decision = evaluateActionAdmission(workspace, {
      id: "action-disable-audit",
      actor: "coding-agent",
      taskId: "task-ai-workspace-mvp",
      capabilityContractId: "capability-context-gate",
      intent: "Disable audit logs to simplify implementation",
      touchedPaths: ["packages/core/src/admission.ts", "packages/core/src/audit.ts"],
      declaredTests: ["packages/core/tests/harness.test.ts"],
      riskSignals: ["audit-bypass"]
    });

    expect(decision.status).toBe("blocked");
    expect(decision.riskLevel).toBe("forbidden");
    expect(decision.reasons[0]).toMatch(/audit/i);
    expect(decision.requiredEvidence).toContain("human-security-review");
  });

  test("escalates actions that touch paths outside the authorized change radius", () => {
    const workspace = createSeedWorkspace();

    const decision = evaluateActionAdmission(workspace, {
      id: "action-touch-billing",
      actor: "coding-agent",
      taskId: "task-ai-workspace-mvp",
      capabilityContractId: "capability-context-gate",
      intent: "Reuse billing settings as a quick persistence layer",
      touchedPaths: ["apps/web/src/App.tsx", "packages/billing/src/store.ts"],
      declaredTests: ["apps/web/src/App.test.tsx"],
      riskSignals: []
    });

    expect(decision.status).toBe("needs-review");
    expect(decision.riskLevel).toBe("high");
    expect(decision.reasons).toContain(
      "Change touches paths outside the task contract: packages/billing/src/store.ts"
    );
  });

  test("builds a task context package from code graph slices, contracts, and evidence requirements", () => {
    const workspace = createSeedWorkspace();

    const contextPackage = buildTaskContextPackage(workspace, "task-ai-workspace-mvp");

    expect(contextPackage.task.title).toBe("Initialize AI-native collaborative workspace MVP");
    expect(contextPackage.codeGraphSlice.nodes.map((node) => node.id)).toContain(
      "node-action-admission"
    );
    expect(contextPackage.reuseCandidates).toEqual([
      "EventLedger",
      "WorkspaceProjector",
      "EvidenceBoard"
    ]);
    expect(contextPackage.requiredSkills).toContain("reuse-first-plan");
    expect(contextPackage.requiredEvidence).toContain("contract-tests");
    expect(contextPackage.forbiddenChanges).toContain("Bypass audit or evidence recording");
  });
});

