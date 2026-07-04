import type { EngineeringEvent, SubspaceKey, WorkspaceItem, WorkspaceProjection, WorkspaceSubspace } from "./types";

const subspaceDefinitions: Record<SubspaceKey, Omit<WorkspaceSubspace, "items">> = {
  problem: {
    key: "problem",
    title: "Problem Definition",
    purpose: "Clarify goals, non-goals, user journeys, assumptions, and risks before implementation."
  },
  architecture: {
    key: "architecture",
    title: "Architecture Contract",
    purpose: "Keep capabilities, ADRs, domains, and boundaries explicit."
  },
  execution: {
    key: "execution",
    title: "Task Execution",
    purpose: "Coordinate humans and agents through task contracts, branches, and change sets."
  },
  evidence: {
    key: "evidence",
    title: "Verification Evidence",
    purpose: "Tie tests, evaluations, screenshots, logs, and review points to the work."
  },
  release: {
    key: "release",
    title: "Release Operations",
    purpose: "Plan rollout, monitoring, rollback, incidents, and operational feedback."
  },
  evolution: {
    key: "evolution",
    title: "Agent Evolution",
    purpose: "Capture failed agent runs and promote reusable lessons into skills, hooks, and evals."
  }
};

const eventSubspaceMap: Record<string, SubspaceKey> = {
  "problem.defined": "problem",
  "capability.contracted": "architecture",
  "adr.recorded": "architecture",
  "task.created": "execution",
  "change.proposed": "execution",
  "verification.contracted": "evidence",
  "evidence.recorded": "evidence",
  "release.planned": "release",
  "agent.sample.recorded": "evolution"
};

export function projectWorkspace(events: EngineeringEvent[]): WorkspaceProjection {
  const subspaces: Record<SubspaceKey, WorkspaceSubspace> = {
    problem: { ...subspaceDefinitions.problem, items: [] },
    architecture: { ...subspaceDefinitions.architecture, items: [] },
    execution: { ...subspaceDefinitions.execution, items: [] },
    evidence: { ...subspaceDefinitions.evidence, items: [] },
    release: { ...subspaceDefinitions.release, items: [] },
    evolution: { ...subspaceDefinitions.evolution, items: [] }
  };

  const traceChain: string[] = [];

  for (const event of events) {
    const subspaceKey = eventSubspaceMap[event.type];
    if (!subspaceKey) {
      continue;
    }

    const item = eventToWorkspaceItem(event);
    subspaces[subspaceKey].items.push(item);

    if (
      event.type === "problem.defined" ||
      event.type === "capability.contracted" ||
      event.type === "adr.recorded" ||
      event.type === "task.created" ||
      event.type === "change.proposed" ||
      event.type === "verification.contracted"
    ) {
      traceChain.push(item.id);
    }
  }

  return {
    subspaces,
    traceChain
  };
}

function eventToWorkspaceItem(event: EngineeringEvent): WorkspaceItem {
  const payload = event.payload as Record<string, unknown>;
  const id = event.type === "evidence.recorded"
    ? getString(payload.evidenceId) ?? event.id
    :
    getString(payload.problemId) ??
    getString(payload.capabilityId) ??
    getString(payload.adrId) ??
    getString(payload.taskId) ??
    getString(payload.changeId) ??
    getString(payload.verificationContractId) ??
    getString(payload.evidenceId) ??
    event.id;

  return {
    id,
    title: getString(payload.title) ?? event.type,
    summary: getString(payload.summary) ?? "",
    status: getString(payload.status)
  };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
