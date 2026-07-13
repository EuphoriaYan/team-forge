export type SubspaceKey =
  | "problem"
  | "architecture"
  | "execution"
  | "evidence"
  | "release"
  | "evolution";

export type RiskLevel = "low" | "medium" | "high" | "forbidden";
export type AdmissionStatus = "allowed" | "needs-review" | "blocked";
export type WorkType = "bug" | "feature" | "new-project";
export type PlanningMode = "standard" | "compact";
export type WorkPhase =
  | "intake"
  | "specified"
  | "planned"
  | "tasks-ready"
  | "implementing"
  | "evidence"
  | "pr"
  | "review"
  | "done"
  | "blocked";
export type ActionStage = "analysis" | "plan" | "tasks" | "implement" | "pr";
export type GateDecision = "approved" | "revised" | "rejected";
export type ChangeSignal =
  | "cross-module"
  | "public-contract"
  | "class-shape"
  | "dependency"
  | "database-ownership";

export type EventType =
  | "problem.defined"
  | "capability.contracted"
  | "adr.recorded"
  | "task.created"
  | "work.classified"
  | "gate.decided"
  | "context.updated"
  | "change.proposed"
  | "verification.contracted"
  | "evidence.recorded"
  | "release.planned"
  | "agent.sample.recorded";

export interface EngineeringEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: EventType;
  actor: string;
  at: string;
  payload: TPayload;
}

export interface WorkspaceItem {
  id: string;
  title: string;
  summary: string;
  status?: string;
}

export interface WorkspaceSubspace {
  key: SubspaceKey;
  title: string;
  purpose: string;
  items: WorkspaceItem[];
}

export interface WorkspaceProjection {
  subspaces: Record<SubspaceKey, WorkspaceSubspace>;
  traceChain: string[];
}

export interface CapabilityContract {
  id: string;
  title: string;
  goal: string;
  inputs: string[];
  outputs: string[];
  requiredSkills: string[];
  requiredEvidence: string[];
  forbiddenChanges: string[];
  allowedPathPrefixes: string[];
}

export interface WorkItemReference {
  workId: string;
  workType: WorkType;
  codingIssueUrl?: string;
  alsoResolvesIssueUrls: string[];
  handoffRequirementUrl?: string;
}

export interface HumanGateRecord {
  gate: string;
  decision: GateDecision;
  decidedBy: string;
  decidedAt: string;
  rationale?: string;
}

export interface WorkArtifacts {
  spec?: string;
  plan?: string;
  tasks?: string;
  impactAnalysis?: string;
  evidenceBoard?: string;
  selfTestResults?: string;
}

export interface TaskContract {
  id: string;
  title: string;
  capabilityContractId: string;
  allowedPathPrefixes: string[];
  reuseCandidates: string[];
  requiredEvidence: string[];
  workItem: WorkItemReference;
  planningMode: PlanningMode;
  phase: WorkPhase;
  artifacts: WorkArtifacts;
  gateRecords: HumanGateRecord[];
}

export interface CodeGraphNode {
  id: string;
  label: string;
  kind: "service" | "module" | "contract" | "view";
  path: string;
  summary: string;
}

export interface ForgeWorkspace {
  events: EngineeringEvent[];
  capabilityContracts: CapabilityContract[];
  taskContracts: TaskContract[];
  codeGraph: CodeGraphNode[];
  sourceSnapshot?: string;
  codeGraphVersion?: string;
}

export interface ActionRequest {
  id: string;
  actor: string;
  taskId: string;
  capabilityContractId: string;
  intent: string;
  stage: ActionStage;
  touchedPaths: string[];
  declaredTests: string[];
  riskSignals: string[];
  changeSignals?: ChangeSignal[];
}

export interface AdmissionDecision {
  actionId: string;
  status: AdmissionStatus;
  riskLevel: RiskLevel;
  reasons: string[];
  requiredEvidence: string[];
}

export interface TaskContextPackage {
  contextVersion: string;
  sourceSnapshot: string;
  codeGraphVersion: string;
  task: TaskContract;
  capability: CapabilityContract;
  codeGraphSlice: {
    nodes: CodeGraphNode[];
  };
  reuseCandidates: string[];
  requiredSkills: string[];
  requiredEvidence: string[];
  forbiddenChanges: string[];
  nextRequiredGate?: string;
  stopConditions: string[];
}

export interface WorkContextRecord {
  schemaVersion: "1.0";
  workId: string;
  workflowRunId?: string;
  lastCompletedAction?: string;
  nextAction?: string;
  updatedAt: string;
  context: TaskContextPackage;
}

export interface WorkContextStore {
  save(record: WorkContextRecord): Promise<void>;
  load(workId: string): Promise<WorkContextRecord | undefined>;
}

export interface ResumeDecision {
  status: "ready" | "blocked";
  workId: string;
  phase: WorkPhase;
  nextAction?: string;
  reasons: string[];
}

export type WorkflowRole = "product" | "architect" | "developer" | "reviewer" | "system";

export interface WorkflowStepDefinition {
  id: string;
  phase: WorkPhase;
  role: WorkflowRole;
  reads: string[];
  writes: string[];
  gate?: {
    authority: string;
    reviseTo?: string;
  };
}

export interface WorkflowDefinition {
  id: string;
  workType: WorkType;
  planningMode: PlanningMode;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowRunState {
  workflowId: string;
  workId: string;
  currentStepId?: string;
  status: "running" | "completed" | "rejected";
  completedStepIds: string[];
  revisionCounts: Record<string, number>;
  gateRecords: HumanGateRecord[];
}
