import type {
  ForgeWorkspace,
  ResumeDecision,
  TaskContextPackage,
  WorkContextRecord,
  WorkflowRunState
} from "./types";

export function buildTaskContextPackage(workspace: ForgeWorkspace, taskId: string): TaskContextPackage {
  const task = workspace.taskContracts.find((taskContract) => taskContract.id === taskId);
  if (!task) {
    throw new Error(`Unknown task contract: ${taskId}`);
  }

  const capability = workspace.capabilityContracts.find(
    (capabilityContract) => capabilityContract.id === task.capabilityContractId
  );
  if (!capability) {
    throw new Error(`Unknown capability contract: ${task.capabilityContractId}`);
  }

  const allowedPrefixes = task.allowedPathPrefixes.length > 0
    ? task.allowedPathPrefixes
    : capability.allowedPathPrefixes;
  const codeGraphNodes = workspace.codeGraph.filter((node) =>
    allowedPrefixes.some((prefix) => node.path.startsWith(prefix))
  );

  return {
    contextVersion: "1.0",
    sourceSnapshot: workspace.sourceSnapshot ?? "unknown",
    codeGraphVersion: workspace.codeGraphVersion ?? "unknown",
    task,
    capability,
    codeGraphSlice: {
      nodes: codeGraphNodes
    },
    reuseCandidates: [...task.reuseCandidates],
    requiredSkills: [...capability.requiredSkills],
    requiredEvidence: [...new Set([...capability.requiredEvidence, ...task.requiredEvidence])],
    forbiddenChanges: [...capability.forbiddenChanges],
    nextRequiredGate: findNextRequiredGate(task),
    stopConditions: [
      "Stop when the work item conflicts with the requested work type.",
      "Stop when source or Code Graph is stale enough to make the change radius uncertain.",
      "Stop before editing outside the approved path radius without a new human decision."
    ]
  };
}

export function createWorkContextRecord(
  context: TaskContextPackage,
  options: {
    updatedAt: string;
    workflowRunId?: string;
    workflowState?: WorkflowRunState;
    lastCompletedAction?: string;
    nextAction?: string;
  }
): WorkContextRecord {
  if (options.workflowState && options.workflowState.workId !== context.task.workItem.workId) {
    throw new Error("Workflow state and Task Context reference different work IDs.");
  }
  if (
    options.workflowState &&
    options.workflowRunId &&
    options.workflowState.runId !== options.workflowRunId
  ) {
    throw new Error("Workflow state and record reference different run IDs.");
  }
  return {
    schemaVersion: "1.0",
    workId: context.task.workItem.workId,
    workflowRunId: options.workflowState?.runId ?? options.workflowRunId,
    lastCompletedAction: options.lastCompletedAction,
    nextAction: options.nextAction,
    updatedAt: options.updatedAt,
    workflowState: options.workflowState,
    context
  };
}

export function evaluateContextResume(
  record: WorkContextRecord,
  currentSourceSnapshot: string,
  currentCodeGraphVersion: string
): ResumeDecision {
  const reasons: string[] = [];

  if (record.workId !== record.context.task.workItem.workId) {
    reasons.push("Stored work ID conflicts with the context task.");
  }
  if (record.workflowState?.workId !== undefined && record.workflowState.workId !== record.workId) {
    reasons.push("Stored workflow state conflicts with the Work Context identity.");
  }
  if (
    record.workflowState &&
    record.workflowRunId &&
    record.workflowState.runId !== record.workflowRunId
  ) {
    reasons.push("Stored workflow state conflicts with the workflow run identity.");
  }
  if (record.context.sourceSnapshot === "unknown" || currentSourceSnapshot === "unknown") {
    reasons.push("Source snapshot is unknown; capture a concrete source revision before resuming.");
  } else if (record.context.sourceSnapshot !== currentSourceSnapshot) {
    reasons.push("Source snapshot changed; refresh impact analysis before resuming.");
  }
  if (record.context.codeGraphVersion === "unknown" || currentCodeGraphVersion === "unknown") {
    reasons.push("Code Graph version is unknown; build a concrete graph slice before resuming.");
  } else if (record.context.codeGraphVersion !== currentCodeGraphVersion) {
    reasons.push("Code Graph version changed; rebuild the task slice before resuming.");
  }

  return {
    status: reasons.length > 0 ? "blocked" : "ready",
    workId: record.workId,
    phase: record.context.task.phase,
    nextAction: reasons.length > 0
      ? "refresh-context-impact"
      : record.workflowState?.currentStepId ?? record.context.nextRequiredGate ?? record.nextAction,
    reasons
  };
}

function findNextRequiredGate(task: TaskContextPackage["task"]): string | undefined {
  const latestDecisions = new Map<string, string>();
  for (const record of task.gateRecords) {
    latestDecisions.set(record.gate, record.decision);
  }
  const approved = new Set(
    [...latestDecisions.entries()]
      .filter(([, decision]) => decision === "approved")
      .map(([gate]) => gate)
  );
  const sequence = task.planningMode === "compact"
    ? ["feature-acceptance", "spec-review", "compact-eligibility", "compact-plan-tasks-review", "implementation-review"]
    : ["feature-acceptance", "spec-review", "plan-review", "tasks-review", "implementation-review"];

  return sequence.find((gate) => !approved.has(gate));
}
