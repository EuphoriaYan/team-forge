import { describe, expect, test } from "vitest";
import {
  advanceWorkflow,
  buildWorkflowDefinition,
  createEventLedger,
  createSeedWorkspace,
  createWorkflowCheckpointEvent,
  projectTaskContractFromWorkflow,
  projectWorkflowRun,
  startWorkflow
} from "../src/index";
import type { WorkflowRunState, WorkflowStepDefinition } from "../src/index";

describe("AI Team workflow core", () => {
  test("builds a bug flow without feature acceptance or product planning", () => {
    const workflow = buildWorkflowDefinition("bug", "standard");
    const stepIds = workflow.steps.map((step) => step.id);

    expect(stepIds).toContain("assess");
    expect(stepIds).toContain("fix");
    expect(stepIds).not.toContain("feature-acceptance");
    expect(stepIds).not.toContain("plan");
  });

  test("isolates feature roles through document handoffs", () => {
    const workflow = buildWorkflowDefinition("feature", "standard");
    const specify = workflow.steps.find((step) => step.id === "specify");
    const plan = workflow.steps.find((step) => step.id === "plan");
    const tasks = workflow.steps.find((step) => step.id === "tasks");

    expect(specify).toMatchObject({ role: "product", writes: ["spec"] });
    expect(plan).toMatchObject({ role: "architect" });
    expect(plan?.reads).toContain("spec-plan-handoff");
    expect(tasks).toMatchObject({ role: "developer" });
    expect(tasks?.reads).toContain("plan-tasks-handoff");
  });

  test("requires Standard planning for new projects", () => {
    expect(() => buildWorkflowDefinition("new-project", "compact")).toThrow(/Standard planning/);
    expect(buildWorkflowDefinition("new-project", "standard").steps[0].id).toBe("bootstrap");
  });

  test("records revise loops and resumes from serialized workflow state", () => {
    const workflow = buildWorkflowDefinition("feature", "compact");
    let state = startWorkflow(workflow, "feature-export-csv", "run-feature-export-csv");

    while (state.currentStepId !== "compact-plan-tasks-review") {
      const current = workflow.steps.find((step) => step.id === state.currentStepId);
      state = advanceWorkflow(workflow, state, current?.gate ? gateRecord(current, state, "approved") : undefined);
    }

    const compactReview = workflow.steps.find((step) => step.id === "compact-plan-tasks-review");
    if (!compactReview) {
      throw new Error("Compact review step is missing.");
    }
    state = advanceWorkflow(workflow, state, gateRecord(compactReview, state, "revised"));
    expect(state.currentStepId).toBe("plan");
    expect(state.revisionCounts["compact-plan-tasks-review"]).toBe(1);

    const resumed = JSON.parse(JSON.stringify(state));
    expect(advanceWorkflow(workflow, resumed).currentStepId).toBe("plan-to-tasks-handoff");
  });

  test("cannot pass a human gate without an explicit decision", () => {
    const workflow = buildWorkflowDefinition("feature", "standard");
    let state = startWorkflow(workflow, "feature-export-csv", "run-feature-export-csv");
    state = advanceWorkflow(workflow, state);
    state = advanceWorkflow(workflow, state);

    expect(state.currentStepId).toBe("feature-acceptance");
    expect(() => advanceWorkflow(workflow, state)).toThrow(/Human decision required/);
    const acceptance = workflow.steps.find((step) => step.id === "feature-acceptance");
    if (!acceptance) {
      throw new Error("Feature acceptance step is missing.");
    }
    const rejected = advanceWorkflow(workflow, state, gateRecord(acceptance, state, "rejected"));
    expect(rejected.status).toBe("rejected");
    expect(rejected.gateRecords[0]).toMatchObject({
      gate: "feature-acceptance",
      decidedBy: "human-reviewer"
    });
  });

  test("checkpoints workflow state through the existing event ledger and projects task gates", () => {
    const workflow = buildWorkflowDefinition("feature", "standard");
    let state = startWorkflow(workflow, "feature-team-forge-mvp", "run-team-forge-mvp");
    state = advanceWorkflow(workflow, state);
    state = advanceWorkflow(workflow, state);
    const acceptance = workflow.steps.find((step) => step.id === state.currentStepId);
    if (!acceptance) {
      throw new Error("Feature acceptance step is missing.");
    }
    state = advanceWorkflow(workflow, state, gateRecord(acceptance, state, "approved"));

    const ledger = createEventLedger();
    ledger.append(createWorkflowCheckpointEvent(state, {
      id: "event-workflow-checkpoint-1",
      actor: "workflow-orchestrator",
      at: "2026-07-13T08:30:00.000Z"
    }));
    const projected = projectWorkflowRun(ledger.list(), state.runId);
    expect(projected).toEqual(state);

    const task = createSeedWorkspace().taskContracts[0];
    const projectedTask = projectTaskContractFromWorkflow(task, workflow, projected!);
    expect(projectedTask.gateRecords).toContainEqual(expect.objectContaining({
      gate: "feature-acceptance",
      decision: "approved"
    }));
    expect(projectedTask.phase).toBe("specified");
  });

  test("rejects a gate record from the wrong authority or workflow run", () => {
    const workflow = buildWorkflowDefinition("feature", "standard");
    let state = startWorkflow(workflow, "feature-export-csv", "run-feature-export-csv");
    state = advanceWorkflow(workflow, state);
    state = advanceWorkflow(workflow, state);
    const acceptance = workflow.steps.find((step) => step.id === state.currentStepId)!;

    expect(() => advanceWorkflow(workflow, state, {
      ...gateRecord(acceptance, state, "approved"),
      authority: "maintainer"
    })).toThrow(/authority/);
    expect(() => advanceWorkflow(workflow, state, {
      ...gateRecord(acceptance, state, "approved"),
      runId: "another-run"
    })).toThrow(/active workflow run/);
  });
});

function gateRecord(
  step: WorkflowStepDefinition,
  state: WorkflowRunState,
  decision: "approved" | "revised" | "rejected"
) {
  if (!step.gate) {
    throw new Error(`Workflow step is not a Gate: ${step.id}`);
  }
  return {
    gate: step.id,
    decision,
    decidedBy: "human-reviewer",
    decidedAt: "2026-07-13T08:00:00.000Z",
    workflowId: state.workflowId,
    runId: state.runId,
    workId: state.workId,
    authority: step.gate.authority
  } as const;
}
