import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildTaskContextPackage,
  createSeedWorkspace,
  createWorkContextRecord
} from "@team-forge/core";
import { afterEach, describe, expect, test } from "vitest";
import { createFileWorkContextStore } from "../src/index";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true
  })));
});

describe("file Work Context store", () => {
  test("persists and reloads a context record using an atomic JSON file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);
    const store = createFileWorkContextStore(directory);
    const context = buildTaskContextPackage(createSeedWorkspace(), "task-ai-workspace-mvp");
    const record = createWorkContextRecord(context, {
      updatedAt: "2026-07-13T07:00:00.000Z",
      workflowRunId: "run-42",
      nextAction: "implement"
    });

    await store.save(record);
    const updated = { ...record, nextAction: "review" };
    await store.save(updated);

    await expect(store.load(record.workId)).resolves.toEqual(updated);
    const persisted = await readFile(join(directory, record.workId, "context.json"), "utf8");
    expect(persisted).toContain('"schemaVersion": "1.0"');
  });

  test("returns undefined for an unknown work ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);

    await expect(createFileWorkContextStore(directory).load("feature-missing")).resolves.toBeUndefined();
  });

  test("rejects path traversal in work IDs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "team-forge-context-"));
    temporaryDirectories.push(directory);

    await expect(createFileWorkContextStore(directory).load("../outside")).rejects.toThrow(/Invalid work ID/);
    await expect(createFileWorkContextStore(directory).load("Feature Uppercase")).rejects.toThrow(/Invalid work ID/);
  });
});
