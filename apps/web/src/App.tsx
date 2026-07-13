import {
  buildTaskContextPackage,
  createSeedWorkspace,
  evaluateActionAdmission,
  projectWorkspace,
  type SubspaceKey
} from "@team-forge/core";
import {
  Activity,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  GitPullRequest,
  Network,
  Radar,
  ShieldAlert,
  Sparkles,
  Workflow
} from "lucide-react";
import "./styles.css";

const workspace = createSeedWorkspace();
const projection = projectWorkspace(workspace.events);
const contextPackage = buildTaskContextPackage(workspace, "task-ai-workspace-mvp");
const admissionDecision = evaluateActionAdmission(workspace, {
  id: "action-web-mvp",
  actor: "coding-agent",
  taskId: "task-ai-workspace-mvp",
  capabilityContractId: "capability-context-gate",
  intent: "Render workspace dashboard and reuse core projection model",
  stage: "implement",
  touchedPaths: ["apps/web/src/App.tsx", "packages/billing/src/store.ts"],
  declaredTests: ["apps/web/src/App.test.tsx"],
  riskSignals: []
});

const subspaceIcons: Record<SubspaceKey, typeof Radar> = {
  problem: Radar,
  architecture: Network,
  execution: Workflow,
  evidence: CheckCircle2,
  release: GitPullRequest,
  evolution: BrainCircuit
};

export function App() {
  const subspaces = Object.values(projection.subspaces);

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI-native R&D control plane</p>
          <h1>Team Forge</h1>
        </div>
        <div className="topbar-status" aria-label="Workspace status">
          <span>
            <Boxes size={16} />
            {projection.traceChain.length} linked objects
          </span>
          <span>
            <Activity size={16} />
            Evidence-first PR ready
          </span>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="subspace-panel" aria-label="Workspace subspaces">
          <div className="panel-heading">
            <Sparkles size={18} />
            <h2>Typed subspaces</h2>
          </div>
          <div className="subspace-list">
            {subspaces.map((subspace) => {
              const Icon = subspaceIcons[subspace.key];

              return (
                <article className="subspace-row" key={subspace.key}>
                  <Icon size={18} aria-hidden="true" />
                  <div>
                    <h3>{subspace.title}</h3>
                    <p>{subspace.purpose}</p>
                  </div>
                  <strong>{subspace.items.length}</strong>
                </article>
              );
            })}
          </div>
        </aside>

        <section className="graph-panel" aria-label="Code graph projection">
          <div className="graph-copy">
            <p className="eyebrow">Code-centric workspace</p>
            <h2>Code Graph is the first projection</h2>
            <p>
              Source code remains the first truth. Intent, constraints, task context, and verification evidence
              become overlays on the graph rather than a separate truth system.
            </p>
          </div>

          <div className="graph-canvas" aria-label="Code graph slice">
            {contextPackage.codeGraphSlice.nodes.map((node, index) => (
              <div className={`graph-node node-${index}`} key={node.id}>
                <span>{node.kind}</span>
                <strong>{node.label}</strong>
                <small>{node.path}</small>
              </div>
            ))}
            <div className="graph-line line-a" />
            <div className="graph-line line-b" />
            <div className="graph-line line-c" />
          </div>

          <div className="context-strip" aria-label="Task context package">
            {contextPackage.reuseCandidates.map((candidate) => (
              <span key={candidate}>{candidate}</span>
            ))}
          </div>
        </section>

        <aside className="gate-panel" aria-label="Admission and evidence">
          <div className="panel-heading">
            <ShieldAlert size={18} />
            <h2>Action Admission</h2>
          </div>

          <div className="decision-block">
            <span className="decision-label">Needs review</span>
            <h3>{contextPackage.task.title}</h3>
            <p>{admissionDecision.reasons[0]}</p>
          </div>

          <section className="evidence-section">
            <h3>Required evidence</h3>
            <div className="evidence-list">
              {admissionDecision.requiredEvidence.map((evidence) => (
                <span key={evidence}>{evidence}</span>
              ))}
            </div>
          </section>

          <section className="evidence-section">
            <h3>Required skills</h3>
            <div className="skill-list">
              {contextPackage.requiredSkills.slice(0, 4).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
