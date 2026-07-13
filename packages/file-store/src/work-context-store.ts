import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { WorkContextRecord, WorkContextStore } from "@team-forge/core";

const validWorkId = /^[a-z0-9][a-z0-9._-]*$/;

export function createFileWorkContextStore(rootDirectory = ".team-forge/work"): WorkContextStore {
  return {
    async save(record) {
      assertWorkId(record.workId);
      const workDirectory = join(rootDirectory, record.workId);
      const target = join(workDirectory, "context.json");
      const temporary = join(workDirectory, `context.${process.pid}.${randomUUID()}.tmp`);

      await mkdir(workDirectory, { recursive: true });
      await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      await rename(temporary, target);
    },

    async load(workId) {
      assertWorkId(workId);
      try {
        const content = await readFile(join(rootDirectory, workId, "context.json"), "utf8");
        return parseRecord(content, workId);
      } catch (error) {
        if (isNotFound(error)) {
          return undefined;
        }
        throw error;
      }
    }
  };
}

function assertWorkId(workId: string): void {
  if (!validWorkId.test(workId)) {
    throw new Error(`Invalid work ID for file storage: ${workId}`);
  }
}

function parseRecord(content: string, expectedWorkId: string): WorkContextRecord {
  const value: unknown = JSON.parse(content);
  if (!isRecord(value) || value.schemaVersion !== "1.0" || value.workId !== expectedWorkId) {
    throw new Error(`Invalid Work Context record: ${expectedWorkId}`);
  }
  if (!isRecord(value.context) || !isRecord(value.context.task)) {
    throw new Error(`Work Context record has no task context: ${expectedWorkId}`);
  }
  const workItem = value.context.task.workItem;
  if (!isRecord(workItem) || workItem.workId !== expectedWorkId) {
    throw new Error(`Work Context task identity conflicts with stored work ID: ${expectedWorkId}`);
  }
  return value as unknown as WorkContextRecord;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}
