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
    (path) => !allowedPrefixes.some((prefix) => isPathInside(path, prefix))
  );

  for (const path of outOfRadiusPaths) {
    reasons.push(`Change touches paths outside the task contract: ${path}`);
    requiredEvidence.add("human-architecture-review");
  }

  if (["implement", "pr"].includes(request.stage) && request.declaredTests.length === 0) {
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
  const approvedGates = approvedGateNames(task.gateRecords);

  if (task.workItem.workType === "new-project" && task.planningMode === "compact") {
    blockers.push("New-project work must use Standard planning.");
  }

  if (task.workItem.workType === "bug") {
    evaluateBugPrerequisites(request, task, approvedGates, blockers);
  } else {
    evaluateFeaturePrerequisites(request, task, approvedGates, blockers);
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

function evaluateFeaturePrerequisites(
  request: ActionRequest,
  task: ForgeWorkspace["taskContracts"][number],
  approvedGates: Set<string>,
  blockers: string[]
): void {
  if (["plan", "tasks", "implement", "pr"].includes(request.stage) && !task.artifacts.spec) {
    blockers.push("A Spec artifact is required before planning or implementation.");
  }
  if (["tasks", "implement", "pr"].includes(request.stage) && !task.artifacts.plan) {
    blockers.push("A Plan artifact is required before task generation or implementation.");
  }
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.tasks) {
    blockers.push("Tasks are required before implementation.");
  }
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.permissionRecord) {
    blockers.push("An implementation permission record is required before implementation.");
  }

  if (["implement", "pr"].includes(request.stage)) {
    const planningGates = task.planningMode === "compact"
      ? ["feature-acceptance", "spec-review", "compact-eligibility", "compact-plan-tasks-review"]
      : ["feature-acceptance", "spec-review", "plan-review", "tasks-review"];
    requireApprovedGates([...planningGates, "implementation-review"], approvedGates, blockers);
  }
}

function evaluateBugPrerequisites(
  request: ActionRequest,
  task: ForgeWorkspace["taskContracts"][number],
  approvedGates: Set<string>,
  blockers: string[]
): void {
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.impactAnalysis) {
    blockers.push("Bug implementation requires recorded impact analysis.");
  }
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.bugAssessment) {
    blockers.push("Bug implementation requires a reviewed bug assessment.");
  }
  if (["implement", "pr"].includes(request.stage) && !task.artifacts.permissionRecord) {
    blockers.push("An implementation permission record is required before implementation.");
  }
  if (["implement", "pr"].includes(request.stage)) {
    const gates = ["impact-review", "assessment-review", "implementation-review"];
    if (request.stage === "pr") {
      gates.push("fix-review");
    }
    requireApprovedGates(gates, approvedGates, blockers);
  }
}

function requireApprovedGates(
  gates: string[],
  approvedGates: Set<string>,
  blockers: string[]
): void {
  for (const gate of gates) {
    if (!approvedGates.has(gate)) {
      blockers.push(`Human gate approval is missing: ${gate}`);
    }
  }
}

function approvedGateNames(records: ForgeWorkspace["taskContracts"][number]["gateRecords"]): Set<string> {
  const latestDecisions = new Map<string, string>();
  for (const record of records) {
    latestDecisions.set(record.gate, record.decision);
  }
  return new Set(
    [...latestDecisions.entries()]
      .filter(([, decision]) => decision === "approved")
      .map(([gate]) => gate)
  );
}

function isPathInside(path: string, prefix: string): boolean {
  const normalizedPath = normalizeRepositoryPath(path);
  const normalizedPrefix = normalizeRepositoryPath(prefix.replace(/\/+$/, ""));
  if (!normalizedPath || !normalizedPrefix) {
    return false;
  }
  const directoryPrefix = normalizedPrefix.endsWith("/")
    ? normalizedPrefix
    : `${normalizedPrefix}/`;
  return normalizedPath === normalizedPrefix.replace(/\/$/, "") || normalizedPath.startsWith(directoryPrefix);
}

function normalizeRepositoryPath(value: string): string | undefined {
  if (!value || value.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(value) || value.includes("\\")) {
    return undefined;
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return undefined;
  }
  return segments.join("/");
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
