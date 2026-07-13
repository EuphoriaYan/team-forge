import type {
  ForgeWorkspace,
  ResumeDecision,
  TaskContextPackage,
  WorkContextRecord
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
    lastCompletedAction?: string;
    nextAction?: string;
  }
): WorkContextRecord {
  return {
    schemaVersion: "1.0",
    workId: context.task.workItem.workId,
    workflowRunId: options.workflowRunId,
    lastCompletedAction: options.lastCompletedAction,
    nextAction: options.nextAction,
    updatedAt: options.updatedAt,
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
  if (record.context.sourceSnapshot !== currentSourceSnapshot) {
    reasons.push("Source snapshot changed; refresh impact analysis before resuming.");
  }
  if (record.context.codeGraphVersion !== currentCodeGraphVersion) {
    reasons.push("Code Graph version changed; rebuild the task slice before resuming.");
  }

  return {
    status: reasons.length > 0 ? "blocked" : "ready",
    workId: record.workId,
    phase: record.context.task.phase,
    nextAction: reasons.length > 0
      ? "refresh-context-impact"
      : record.context.nextRequiredGate ?? record.nextAction,
    reasons
  };
}

function findNextRequiredGate(task: TaskContextPackage["task"]): string | undefined {
  const approved = new Set(
    task.gateRecords.filter((record) => record.decision === "approved").map((record) => record.gate)
  );
  const sequence = task.planningMode === "compact"
    ? ["spec-review", "compact-eligibility", "compact-plan-tasks-review"]
    : ["spec-review", "plan-review", "tasks-review"];

  return sequence.find((gate) => !approved.has(gate));
}
