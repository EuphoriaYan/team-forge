import type { ForgeWorkspace, TaskContextPackage } from "./types";

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

function findNextRequiredGate(task: TaskContextPackage["task"]): string | undefined {
  const approved = new Set(
    task.gateRecords.filter((record) => record.decision === "approved").map((record) => record.gate)
  );
  const sequence = task.planningMode === "compact"
    ? ["spec-review", "compact-eligibility", "compact-plan-tasks-review"]
    : ["spec-review", "plan-review", "tasks-review"];

  return sequence.find((gate) => !approved.has(gate));
}
