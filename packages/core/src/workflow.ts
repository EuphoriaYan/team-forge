import type {
  HumanGateRecord,
  PlanningMode,
  WorkflowDefinition,
  WorkflowRunState,
  WorkflowStepDefinition,
  WorkType
} from "./types";

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

export function startWorkflow(definition: WorkflowDefinition, workId: string): WorkflowRunState {
  if (!workId.trim()) {
    throw new Error("Workflow run requires a stable work ID.");
  }

  return {
    workflowId: definition.id,
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
  gateRecord?: HumanGateRecord
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
    assertGateRecord(current, gateRecord);
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

function assertGateRecord(stepDefinition: WorkflowStepDefinition, record: HumanGateRecord): void {
  if (record.gate !== stepDefinition.id) {
    throw new Error(`Gate record is for ${record.gate}, not ${stepDefinition.id}.`);
  }
  if (!record.decidedBy.trim() || Number.isNaN(Date.parse(record.decidedAt))) {
    throw new Error(`Gate record requires a decision owner and valid timestamp: ${record.gate}`);
  }
}
