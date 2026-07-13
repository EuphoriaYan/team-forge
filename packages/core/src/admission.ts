import type { ActionRequest, AdmissionDecision, ForgeWorkspace, RiskLevel } from "./types";
import { validateWorkItemReference } from "./work-item";

const forbiddenRiskSignals = new Map<string, string>([
  ["audit-bypass", "Audit or evidence recording cannot be bypassed."],
  ["auth-bypass", "Authentication and authorization boundaries cannot be bypassed."],
  ["data-access-expansion", "Data access expansion requires explicit security review."]
]);

export function evaluateActionAdmission(workspace: ForgeWorkspace, request: ActionRequest): AdmissionDecision {
  const task = workspace.taskContracts.find((taskContract) => taskContract.id === request.taskId);
  const capability = workspace.capabilityContracts.find(
    (capabilityContract) => capabilityContract.id === request.capabilityContractId
  );

  const reasons: string[] = [];
  const blockingReasons: string[] = [];
  const requiredEvidence = new Set<string>([
    ...(task?.requiredEvidence ?? []),
    ...(capability?.requiredEvidence ?? [])
  ]);

  if (!task) {
    return blockedDecision(request.id, `Unknown task contract: ${request.taskId}`);
  }
  if (!capability) {
    return blockedDecision(request.id, `Unknown capability contract: ${request.capabilityContractId}`);
  }
  if (task.capabilityContractId !== capability.id) {
    return blockedDecision(request.id, "Task and action reference different capability contracts.");
  }

  blockingReasons.push(...validateWorkItemReference(task.workItem));
  evaluateStagePrerequisites(request, task, blockingReasons, requiredEvidence);
  reasons.push(...blockingReasons);

  for (const signal of request.riskSignals) {
    const forbiddenReason = forbiddenRiskSignals.get(signal);
    if (forbiddenReason) {
      reasons.push(forbiddenReason);
      requiredEvidence.add("human-security-review");
    }
  }

  const allowedPrefixes = task.allowedPathPrefixes.length > 0
    ? task.allowedPathPrefixes
    : capability.allowedPathPrefixes;
  const outOfRadiusPaths = request.touchedPaths.filter(
    (path) => !allowedPrefixes.some((prefix) => path.startsWith(prefix))
  );

  for (const path of outOfRadiusPaths) {
    reasons.push(`Change touches paths outside the task contract: ${path}`);
    requiredEvidence.add("human-architecture-review");
  }

  if (request.declaredTests.length === 0) {
    reasons.push("Action declares no verification tests.");
    requiredEvidence.add("contract-tests");
  }

  const riskLevel = determineRiskLevel(reasons, outOfRadiusPaths, request.riskSignals);

  return {
    actionId: request.id,
    status: riskLevel === "forbidden" || blockingReasons.length > 0
      ? "blocked"
      : reasons.length > 0
        ? "needs-review"
        : "allowed",
    riskLevel,
    reasons,
    requiredEvidence: [...requiredEvidence]
  };
}

function evaluateStagePrerequisites(
  request: ActionRequest,
  task: ForgeWorkspace["taskContracts"][number],
  blockers: string[],
  requiredEvidence: Set<string>
): void {
  const approvedGates = new Set(
    task.gateRecords.filter((record) => record.decision === "approved").map((record) => record.gate)
  );

  if (["plan", "tasks", "implement", "pr"].includes(request.stage) && !task.artifacts.spec) {
    blockers.push("A Spec artifact is required before planning or implementation.");
  }
  if (["tasks", "implement", "pr"].includes(request.stage) && !task.artifacts.plan) {
    blockers.push("A Plan artifact is required before task generation or implementation.");
  }
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.tasks) {
    blockers.push("Tasks are required before implementation.");
  }

  if (task.workItem.workType === "new-project" && task.planningMode === "compact") {
    blockers.push("New-project work must use Standard planning.");
  }

  if (request.stage === "implement") {
    const gates = task.planningMode === "compact"
      ? ["spec-review", "compact-eligibility", "compact-plan-tasks-review"]
      : ["spec-review", "plan-review", "tasks-review"];
    for (const gate of gates) {
      if (!approvedGates.has(gate)) {
        blockers.push(`Human gate approval is missing: ${gate}`);
      }
    }
  }

  if (request.stage === "pr") {
    if (!task.artifacts.evidenceBoard) {
      blockers.push("An Evidence Board is required before PR submission.");
    }
    if (!task.artifacts.selfTestResults) {
      blockers.push("Fresh self-test results are required before PR submission.");
    }
  }

  if ((request.changeSignals?.length ?? 0) > 0) {
    if (!task.artifacts.impactAnalysis) {
      blockers.push("Architecture-sensitive changes require recorded impact analysis.");
    }
    if (!approvedGates.has("architecture-impact-review")) {
      blockers.push("Architecture-sensitive changes require human impact approval.");
    }
    requiredEvidence.add("code-graph-impact");
    requiredEvidence.add("human-architecture-review");
  }
}

function blockedDecision(actionId: string, reason: string): AdmissionDecision {
  return {
    actionId,
    status: "blocked",
    riskLevel: "forbidden",
    reasons: [reason],
    requiredEvidence: []
  };
}

function determineRiskLevel(reasons: string[], outOfRadiusPaths: string[], riskSignals: string[]): RiskLevel {
  if (riskSignals.some((signal) => forbiddenRiskSignals.has(signal))) {
    return "forbidden";
  }

  if (outOfRadiusPaths.length > 0) {
    return "high";
  }

  if (reasons.length > 0) {
    return "medium";
  }

  return "low";
}
