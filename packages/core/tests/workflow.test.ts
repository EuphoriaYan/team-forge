import { describe, expect, test } from "vitest";
import {
  advanceWorkflow,
  buildWorkflowDefinition,
  startWorkflow
} from "../src/index";

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
    let state = startWorkflow(workflow, "feature-export-csv");

    while (state.currentStepId !== "compact-plan-tasks-review") {
      const current = workflow.steps.find((step) => step.id === state.currentStepId);
      state = advanceWorkflow(workflow, state, current?.gate ? gateRecord(current.id, "approved") : undefined);
    }

    state = advanceWorkflow(workflow, state, gateRecord("compact-plan-tasks-review", "revised"));
    expect(state.currentStepId).toBe("plan");
    expect(state.revisionCounts["compact-plan-tasks-review"]).toBe(1);

    const resumed = JSON.parse(JSON.stringify(state));
    expect(advanceWorkflow(workflow, resumed).currentStepId).toBe("plan-to-tasks-handoff");
  });

  test("cannot pass a human gate without an explicit decision", () => {
    const workflow = buildWorkflowDefinition("feature", "standard");
    let state = startWorkflow(workflow, "feature-export-csv");
    state = advanceWorkflow(workflow, state);
    state = advanceWorkflow(workflow, state);

    expect(state.currentStepId).toBe("feature-acceptance");
    expect(() => advanceWorkflow(workflow, state)).toThrow(/Human decision required/);
    const rejected = advanceWorkflow(workflow, state, gateRecord("feature-acceptance", "rejected"));
    expect(rejected.status).toBe("rejected");
    expect(rejected.gateRecords[0]).toMatchObject({
      gate: "feature-acceptance",
      decidedBy: "human-reviewer"
    });
  });
});

function gateRecord(gate: string, decision: "approved" | "revised" | "rejected") {
  return {
    gate,
    decision,
    decidedBy: "human-reviewer",
    decidedAt: "2026-07-13T08:00:00.000Z"
  } as const;
}
