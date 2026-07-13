import type {
  EngineeringEvent,
  PlanningMode,
  TaskContract,
  WorkflowCheckpointPayload,
  WorkflowDefinition,
  WorkflowGateRecord,
  WorkflowRunState,
  WorkflowStepDefinition,
  WorkType
} from "./types";
import { isValidWorkId } from "./work-item";

export function buildWorkflowDefinition(
  workType: WorkType,
  planningMode: PlanningMode
): WorkflowDefinition {
  if (workType === "new-project" && planningMode === "compact") {
    throw new Error("New-project work must use Standard planning.");
  }

  const steps = workType === "bug"
    ? bugSteps()
    : featureSteps(workType, planningMode);

  return {
    id: `ai-team-${workType}-${planningMode}`,
    workType,
    planningMode,
    steps
  };
}

export function startWorkflow(
  definition: WorkflowDefinition,
  workId: string,
  runId: string
): WorkflowRunState {
  if (!isValidWorkId(workId)) {
    throw new Error("Workflow run requires a valid stable work ID.");
  }
  if (!runId.trim()) {
    throw new Error("Workflow run requires a stable run ID.");
  }

  return {
    workflowId: definition.id,
    runId,
    workId,
    currentStepId: definition.steps[0]?.id,
    status: definition.steps.length > 0 ? "running" : "completed",
    completedStepIds: [],
    revisionCounts: {},
    gateRecords: []
  };
}

export function advanceWorkflow(
  definition: WorkflowDefinition,
  state: WorkflowRunState,
  gateRecord?: WorkflowGateRecord
): WorkflowRunState {
  assertRunMatches(definition, state);
  if (state.status !== "running" || !state.currentStepId) {
    throw new Error(`Workflow run is not active: ${state.status}`);
  }

  const currentIndex = definition.steps.findIndex((step) => step.id === state.currentStepId);
  if (currentIndex < 0) {
    throw new Error(`Unknown workflow step: ${state.currentStepId}`);
  }
  const current = definition.steps[currentIndex];

  if (current.gate && !gateRecord) {
    throw new Error(`Human decision required for gate: ${current.id}`);
  }
  if (!current.gate && gateRecord) {
    throw new Error(`Step is not a human gate: ${current.id}`);
  }
  if (gateRecord) {
    assertGateRecord(current, gateRecord, state);
  }
  const gateRecords = gateRecord ? [...state.gateRecords, gateRecord] : state.gateRecords;

  if (gateRecord?.decision === "rejected") {
    return { ...state, status: "rejected", gateRecords };
  }
  if (gateRecord?.decision === "revised") {
    if (!current.gate?.reviseTo) {
      throw new Error(`Gate does not define a revision target: ${current.id}`);
    }
    assertStepExists(definition, current.gate.reviseTo);
    return {
      ...state,
      currentStepId: current.gate.reviseTo,
      revisionCounts: {
        ...state.revisionCounts,
        [current.id]: (state.revisionCounts[current.id] ?? 0) + 1
      },
      gateRecords
    };
  }

  const completedStepIds = state.completedStepIds.includes(current.id)
    ? state.completedStepIds
    : [...state.completedStepIds, current.id];
  const next = definition.steps[currentIndex + 1];

  return {
    ...state,
    currentStepId: next?.id,
    status: next ? "running" : "completed",
    completedStepIds,
    gateRecords
  };
}

export function createWorkflowCheckpointEvent(
  state: WorkflowRunState,
  metadata: { id: string; actor: string; at: string }
): EngineeringEvent<WorkflowCheckpointPayload> {
  if (!metadata.id.trim() || !metadata.actor.trim() || Number.isNaN(Date.parse(metadata.at))) {
    throw new Error("Workflow checkpoint requires an event ID, actor, and valid timestamp.");
  }
  return {
    id: metadata.id,
    type: "workflow.checkpointed",
    actor: metadata.actor,
    at: metadata.at,
    payload: {
      workflowId: state.workflowId,
      runId: state.runId,
      workId: state.workId,
      state: cloneWorkflowState(state)
    }
  };
}

export function projectWorkflowRun(
  events: EngineeringEvent[],
  runId: string
): WorkflowRunState | undefined {
  let latest: WorkflowRunState | undefined;
  for (const event of events) {
    if (event.type !== "workflow.checkpointed") {
      continue;
    }
    const payload = event.payload as Partial<WorkflowCheckpointPayload>;
    if (payload.runId === runId && payload.state?.runId === runId) {
      latest = cloneWorkflowState(payload.state);
    }
  }
  return latest;
}

export function projectTaskContractFromWorkflow(
  task: TaskContract,
  definition: WorkflowDefinition,
  state: WorkflowRunState
): TaskContract {
  assertRunMatches(definition, state);
  if (task.workItem.workId !== state.workId) {
    throw new Error("Workflow and task contract reference different work IDs.");
  }
  if (task.workItem.workType !== definition.workType || task.planningMode !== definition.planningMode) {
    throw new Error("Workflow and task contract use different work type or planning mode.");
  }
  const current = definition.steps.find((candidate) => candidate.id === state.currentStepId);
  return {
    ...task,
    phase: state.status === "completed" ? "done" : state.status === "rejected" ? "blocked" : current?.phase ?? task.phase,
    gateRecords: state.gateRecords.map(({ gate, decision, decidedBy, decidedAt, rationale }) => ({
      gate,
      decision,
      decidedBy,
      decidedAt,
      rationale
    }))
  };
}

function featureSteps(workType: "feature" | "new-project", planningMode: PlanningMode): WorkflowStepDefinition[] {
  const bootstrap: WorkflowStepDefinition[] = workType === "new-project"
    ? [step("bootstrap", "intake", "architect", ["project-charter"], ["workspace-skeleton"])]
    : [];
  const sharedStart: WorkflowStepDefinition[] = [
    step("context", "intake", "system", ["work-item"], ["work-context"]),
    step("impact", "intake", "architect", ["source", "code-graph", "work-context"], ["impact-analysis"]),
    gate("feature-acceptance", "intake", "technical-committee", ["work-item", "impact-analysis"], "impact"),
    step("specify", "specified", "product", ["work-item", "impact-analysis"], ["spec"]),
    gate("spec-review", "specified", "maintainer", ["spec"], "specify"),
    step("spec-to-plan-handoff", "specified", "system", ["spec"], ["spec-plan-handoff"])
  ];
  const planning = planningMode === "compact" ? compactPlanningSteps() : standardPlanningSteps();
  const finish: WorkflowStepDefinition[] = [
    step("implementation-permission", "tasks-ready", "reviewer", ["tasks", "impact-analysis"], ["permission-record"]),
    gate("implementation-review", "tasks-ready", "module-owner", ["permission-record", "tasks"], "implementation-permission"),
    step("implement", "implementing", "developer", ["spec", "plan", "tasks", "permission-record"], ["change-set"]),
    step("verify", "evidence", "developer", ["change-set", "verification-contract"], ["self-test-results"]),
    step("evidence", "evidence", "system", ["self-test-results", "impact-analysis"], ["evidence-board"]),
    gate("pr-review", "review", "maintainer", ["change-set", "evidence-board"], "implement")
  ];

  return [...bootstrap, ...sharedStart, ...planning, ...finish];
}

function standardPlanningSteps(): WorkflowStepDefinition[] {
  return [
    step("plan", "planned", "architect", ["spec", "spec-plan-handoff", "impact-analysis"], ["plan"]),
    gate("plan-review", "planned", "architecture-owner", ["plan", "impact-analysis"], "plan"),
    step("plan-to-tasks-handoff", "planned", "system", ["plan"], ["plan-tasks-handoff"]),
    step("tasks", "tasks-ready", "developer", ["plan", "plan-tasks-handoff"], ["tasks"]),
    gate("tasks-review", "tasks-ready", "maintainer", ["plan", "tasks"], "tasks")
  ];
}

function compactPlanningSteps(): WorkflowStepDefinition[] {
  return [
    gate("compact-eligibility", "specified", "maintainer", ["impact-analysis"]),
    step("plan", "planned", "architect", ["spec", "spec-plan-handoff", "impact-analysis"], ["plan"]),
    step("plan-to-tasks-handoff", "planned", "system", ["plan"], ["plan-tasks-handoff"]),
    step("tasks", "tasks-ready", "developer", ["plan", "plan-tasks-handoff"], ["tasks"]),
    gate("compact-plan-tasks-review", "tasks-ready", "maintainer", ["plan", "tasks"], "plan")
  ];
}

function bugSteps(): WorkflowStepDefinition[] {
  return [
    step("context", "intake", "system", ["coding-issue"], ["work-context"]),
    step("impact", "intake", "architect", ["source", "code-graph", "work-context"], ["impact-analysis"]),
    gate("impact-review", "intake", "architecture-owner", ["impact-analysis"], "impact"),
    step("assess", "specified", "developer", ["coding-issue", "impact-analysis", "source"], ["bug-assessment"]),
    gate("assessment-review", "specified", "maintainer", ["bug-assessment"], "assess"),
    step("implementation-permission", "tasks-ready", "reviewer", ["bug-assessment"], ["permission-record"]),
    gate("implementation-review", "tasks-ready", "module-owner", ["permission-record", "bug-assessment"], "implementation-permission"),
    step("fix", "implementing", "developer", ["bug-assessment", "permission-record"], ["change-set"]),
    gate("fix-review", "implementing", "maintainer", ["change-set", "bug-assessment"], "fix"),
    step("verify", "evidence", "developer", ["change-set", "coding-issue"], ["self-test-results"]),
    step("evidence", "evidence", "system", ["self-test-results", "impact-analysis"], ["evidence-board"]),
    gate("pr-review", "review", "maintainer", ["change-set", "evidence-board"], "fix")
  ];
}

function step(
  id: string,
  phase: WorkflowStepDefinition["phase"],
  role: WorkflowStepDefinition["role"],
  reads: string[],
  writes: string[]
): WorkflowStepDefinition {
  return { id, phase, role, reads, writes };
}

function gate(
  id: string,
  phase: WorkflowStepDefinition["phase"],
  authority: string,
  reads: string[],
  reviseTo?: string
): WorkflowStepDefinition {
  return {
    id,
    phase,
    role: "reviewer",
    reads,
    writes: ["human-gate-record"],
    gate: { authority, reviseTo }
  };
}

function assertRunMatches(definition: WorkflowDefinition, state: WorkflowRunState): void {
  if (state.workflowId !== definition.id) {
    throw new Error(`Workflow state belongs to ${state.workflowId}, not ${definition.id}.`);
  }
}

function assertStepExists(definition: WorkflowDefinition, stepId: string): void {
  if (!definition.steps.some((stepDefinition) => stepDefinition.id === stepId)) {
    throw new Error(`Unknown revision target: ${stepId}`);
  }
}

function assertGateRecord(
  stepDefinition: WorkflowStepDefinition,
  record: WorkflowGateRecord,
  state: WorkflowRunState
): void {
  if (record.gate !== stepDefinition.id) {
    throw new Error(`Gate record is for ${record.gate}, not ${stepDefinition.id}.`);
  }
  if (
    record.workflowId !== state.workflowId ||
    record.runId !== state.runId ||
    record.workId !== state.workId
  ) {
    throw new Error(`Gate record does not belong to the active workflow run: ${record.gate}`);
  }
  if (record.authority !== stepDefinition.gate?.authority) {
    throw new Error(`Gate record authority ${record.authority} cannot approve ${record.gate}.`);
  }
  if (!record.decidedBy.trim() || Number.isNaN(Date.parse(record.decidedAt))) {
    throw new Error(`Gate record requires a decision owner and valid timestamp: ${record.gate}`);
  }
}

function cloneWorkflowState(state: WorkflowRunState): WorkflowRunState {
  return {
    ...state,
    completedStepIds: [...state.completedStepIds],
    revisionCounts: { ...state.revisionCounts },
    gateRecords: state.gateRecords.map((record) => ({ ...record }))
  };
}
