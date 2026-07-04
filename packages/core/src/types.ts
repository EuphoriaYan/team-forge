export type SubspaceKey =
  | "problem"
  | "architecture"
  | "execution"
  | "evidence"
  | "release"
  | "evolution";

export type RiskLevel = "low" | "medium" | "high" | "forbidden";
export type AdmissionStatus = "allowed" | "needs-review" | "blocked";

export type EventType =
  | "problem.defined"
  | "capability.contracted"
  | "adr.recorded"
  | "task.created"
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

export interface TaskContract {
  id: string;
  title: string;
  capabilityContractId: string;
  allowedPathPrefixes: string[];
  reuseCandidates: string[];
  requiredEvidence: string[];
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
}

export interface ActionRequest {
  id: string;
  actor: string;
  taskId: string;
  capabilityContractId: string;
  intent: string;
  touchedPaths: string[];
  declaredTests: string[];
  riskSignals: string[];
}

export interface AdmissionDecision {
  actionId: string;
  status: AdmissionStatus;
  riskLevel: RiskLevel;
  reasons: string[];
  requiredEvidence: string[];
}

export interface TaskContextPackage {
  task: TaskContract;
  capability: CapabilityContract;
  codeGraphSlice: {
    nodes: CodeGraphNode[];
  };
  reuseCandidates: string[];
  requiredSkills: string[];
  requiredEvidence: string[];
  forbiddenChanges: string[];
}

