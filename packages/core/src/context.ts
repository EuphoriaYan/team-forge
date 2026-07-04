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

  return {
    task,
    capability,
    codeGraphSlice: {
      nodes: workspace.codeGraph.filter((node) =>
        ["node-event-ledger", "node-workspace-projector", "node-action-admission", "node-evidence-board"].includes(
          node.id
        )
      )
    },
    reuseCandidates: [...task.reuseCandidates],
    requiredSkills: [...capability.requiredSkills],
    requiredEvidence: [...new Set([...capability.requiredEvidence, ...task.requiredEvidence])],
    forbiddenChanges: [...capability.forbiddenChanges]
  };
}

