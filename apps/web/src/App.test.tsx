import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { App } from "./App";

describe("Team Forge workspace", () => {
  test("renders the code graph centered workspace and the six typed subspaces", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Team Forge/i })).toBeInTheDocument();
    expect(screen.getByText(/Code Graph is the first projection/i)).toBeInTheDocument();

    const subspaceList = screen.getByLabelText("Workspace subspaces");
    expect(within(subspaceList).getByText("Problem Definition")).toBeInTheDocument();
    expect(within(subspaceList).getByText("Architecture Contract")).toBeInTheDocument();
    expect(within(subspaceList).getByText("Task Execution")).toBeInTheDocument();
    expect(within(subspaceList).getByText("Verification Evidence")).toBeInTheDocument();
    expect(within(subspaceList).getByText("Release Operations")).toBeInTheDocument();
    expect(within(subspaceList).getByText("Agent Evolution")).toBeInTheDocument();
  });

  test("shows admission gate status and evidence requirements from the core model", () => {
    render(<App />);

    expect(screen.getByText("Action Admission")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText(/Change touches paths outside the task contract/i)).toBeInTheDocument();
    expect(screen.getByText("contract-tests")).toBeInTheDocument();
    expect(screen.getByText("human-architecture-review")).toBeInTheDocument();
  });
});

