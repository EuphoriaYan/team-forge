import type { WorkItemReference } from "./types";

const validWorkId = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidWorkId(workId: string): boolean {
  return validWorkId.test(workId);
}

export function validateWorkItemReference(workItem: WorkItemReference): string[] {
  const reasons: string[] = [];

  if (!isValidWorkId(workItem.workId)) {
    reasons.push("Work item must have a lowercase stable ID using letters, numbers, '.', '_' or '-'.");
  }

  if (workItem.workType === "bug") {
    if (!workItem.codingIssueUrl) {
      reasons.push("Bug work must link a coding repository issue.");
    }
    if (workItem.handoffRequirementUrl) {
      reasons.push("Bug work cannot use a confidential feature handoff as its primary source.");
    }
  } else if (!workItem.codingIssueUrl && !workItem.handoffRequirementUrl) {
    reasons.push("Feature and new-project work must link a coding issue or requirement handoff.");
  }

  if (workItem.alsoResolvesIssueUrls.length > 0 && !workItem.codingIssueUrl) {
    reasons.push("Additional resolved issues require a primary coding issue.");
  }

  const urls = [
    workItem.codingIssueUrl,
    workItem.handoffRequirementUrl,
    ...workItem.alsoResolvesIssueUrls
  ].filter((url): url is string => Boolean(url));

  for (const url of urls) {
    if (!isHttpUrl(url)) {
      reasons.push(`Work item URL must use http or https: ${url}`);
    }
  }

  if (new Set(urls).size !== urls.length) {
    reasons.push("Primary and additional work item URLs must be unique.");
  }

  return reasons;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
