import type { ActionRequest, AdmissionDecision, ForgeWorkspace, RiskLevel } from "./types";

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
  const requiredEvidence = new Set<string>([
    ...(task?.requiredEvidence ?? []),
    ...(capability?.requiredEvidence ?? [])
  ]);

  for (const signal of request.riskSignals) {
    const forbiddenReason = forbiddenRiskSignals.get(signal);
    if (forbiddenReason) {
      reasons.push(forbiddenReason);
      requiredEvidence.add("human-security-review");
    }
  }

  const allowedPrefixes = task?.allowedPathPrefixes ?? capability?.allowedPathPrefixes ?? [];
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
    status: riskLevel === "forbidden" ? "blocked" : reasons.length > 0 ? "needs-review" : "allowed",
    riskLevel,
    reasons,
    requiredEvidence: [...requiredEvidence]
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

