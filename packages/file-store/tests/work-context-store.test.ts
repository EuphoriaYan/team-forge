import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advanceWorkflow,
  buildWorkflowDefinition,
  buildTaskContextPackage,
  createEventLedger,
  createSeedWorkspace,
  createWorkflowCheckpointEvent,
  createWorkContextRecord,
  evaluateActionAdmission,
  evaluateContextResume,
  projectTaskContractFromWorkflow,
  projectWorkflowRun,
  startWorkflow
} from "@team-forge/core";
import type { WorkflowRunState, WorkflowStepDefinition } from "@team-forge/core";
import { afterEach, describe, expect, test } from "vitest";
import { createFileWorkContextStore } from "../src/index";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true
  })));
});

describe("file Work Context store", () => {
  test("persists and reloads a context record using an atomic JSON file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);
    const store = createFileWorkContextStore(directory);
    const context = buildTaskContextPackage(createSeedWorkspace(), "task-ai-workspace-mvp");
    const record = createWorkContextRecord(context, {
      updatedAt: "2026-07-13T07:00:00.000Z",
      workflowRunId: "run-42",
      nextAction: "implement"
    });

    await store.save(record);
    const updated = { ...record, nextAction: "review" };
    await store.save(updated);

    await expect(store.load(record.workId)).resolves.toEqual(updated);
    const persisted = await readFile(join(directory, record.workId, "context.json"), "utf8");
    expect(persisted).toContain('"schemaVersion": "1.0"');
  });

  test("returns undefined for an unknown work ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);

    await expect(createFileWorkContextStore(directory).load("feature-missing")).resolves.toBeUndefined();
  });

  test("rejects path traversal in work IDs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);

    await expect(createFileWorkContextStore(directory).load("../outside")).rejects.toThrow(/Invalid work ID/);
    await expect(createFileWorkContextStore(directory).load("Feature Uppercase")).rejects.toThrow(/Invalid work ID/);
  });

  test("persists a workflow checkpoint that resumes into Admission without copying Gate state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);
    const workspace = createSeedWorkspace();
    const task = workspace.taskContracts[0];
    task.workItem = {
      workId: "bug-team-forge-12",
      workType: "bug",
      codingIssueUrl: "https://github.com/example/team-forge/issues/12",
      alsoResolvesIssueUrls: []
    };
    task.artifacts = {
      impactAnalysis: "impact.md",
      bugAssessment: "bug-assessment.md",
      permissionRecord: "permission.md"
    };
    task.gateRecords = [];

    const workflow = buildWorkflowDefinition("bug", "standard");
    let state = startWorkflow(workflow, task.workItem.workId, "run-bug-team-forge-12");
    while (state.currentStepId !== "fix") {
      const step = workflow.steps.find((candidate) => candidate.id === state.currentStepId);
      if (!step) {
        throw new Error(`Unknown workflow step: ${state.currentStepId}`);
      }
      state = advanceWorkflow(workflow, state, step.gate ? gateRecord(step, state) : undefined);
    }

    const ledger = createEventLedger();
    ledger.append(createWorkflowCheckpointEvent(state, {
      id: "event-bug-ready-to-fix",
      actor: "workflow-orchestrator",
      at: "2026-07-13T08:30:00.000Z"
    }));
    const projectedState = projectWorkflowRun(ledger.list(), state.runId)!;
    workspace.taskContracts[0] = projectTaskContractFromWorkflow(task, workflow, projectedState);
    const context = buildTaskContextPackage(workspace, task.id);
    const record = createWorkContextRecord(context, {
      updatedAt: "2026-07-13T08:31:00.000Z",
      workflowState: projectedState
    });

    const store = createFileWorkContextStore(directory);
    await store.save(record);
    const loaded = await store.load(record.workId);
    expect(loaded).toEqual(record);
    expect(evaluateContextResume(
      loaded!,
      workspace.sourceSnapshot!,
      workspace.codeGraphVersion!
    )).toMatchObject({ status: "ready", nextAction: "fix" });
    expect(evaluateActionAdmission(workspace, {
      id: "action-fix-bug",
      actor: "coding-agent",
      taskId: task.id,
      capabilityContractId: task.capabilityContractId,
      intent: "Implement the approved bug fix",
      stage: "implement",
      touchedPaths: ["packages/core/src/context.ts"],
      declaredTests: ["packages/core/tests/harness.test.ts"],
      riskSignals: []
    })).toMatchObject({ status: "allowed", reasons: [] });
  });
});

function gateRecord(step: WorkflowStepDefinition, state: WorkflowRunState) {
  if (!step.gate) {
    throw new Error(`Workflow step is not a Gate: ${step.id}`);
  }
  return {
    gate: step.id,
    decision: "approved" as const,
    decidedBy: "human-reviewer",
    decidedAt: "2026-07-13T08:00:00.000Z",
    workflowId: state.workflowId,
    runId: state.runId,
    workId: state.workId,
    authority: step.gate.authority
  };
}
