import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage } from "../pagination";
import { searchParamsSchema, type SearchFilter } from "../schemas";

async function getIssueStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.issues.retrieve(id);
}

export const getIssue = (apiKey: string) =>
  tool({
    description:
      "Get a Pylon issue by its ID or number, including title, state, source, requester, account, tags, and timing metadata.",
    inputSchema: z.object({
      id: z.string().describe("Pylon issue ID or issue number"),
    }),
    execute: async (args) => getIssueStep({ apiKey, ...args }),
  });

async function listIssuesStep({
  apiKey,
  endTime,
  startTime,
}: {
  apiKey: string;
  endTime: string;
  startTime: string;
}) {
  "use step";
  const client = createPylonClient(apiKey);

  return summarizePage(
    client.issues.list({
      end_time: endTime,
      start_time: startTime,
    }),
  );
}

export const listIssues = (apiKey: string) =>
  tool({
    description:
      "List Pylon issues in a time window. The start and end time must be RFC3339 timestamps no more than 30 days apart.",
    inputSchema: z.object({
      endTime: z.string().describe("End of the issue creation window as an RFC3339 timestamp"),
      startTime: z.string().describe("Start of the issue creation window as an RFC3339 timestamp"),
    }),
    execute: async (args) => listIssuesStep({ apiKey, ...args }),
  });

async function listIssueFollowersStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.issues.listFollowers(id);
}

export const listIssueFollowers = (apiKey: string) =>
  tool({
    description: "List followers for a Pylon issue by issue ID or issue number.",
    inputSchema: z.object({
      id: z.string().describe("Pylon issue ID or issue number"),
    }),
    execute: async (args) => listIssueFollowersStep({ apiKey, ...args }),
  });

async function searchIssuesStep({
  apiKey,
  cursor,
  filter,
  limit,
}: {
  apiKey: string;
  cursor?: string | undefined;
  filter: SearchFilter;
  limit: number;
}) {
  "use step";
  const client = createPylonClient(apiKey);
  const params = cursor === undefined ? { filter, limit } : { cursor, filter, limit };

  return summarizePage(client.issues.search(params));
}

export const searchIssues = (apiKey: string) =>
  tool({
    description:
      "Search Pylon issues by filter. Useful for finding support cases by state, account, requester, tag, source, team, or custom fields.",
    inputSchema: searchParamsSchema,
    execute: async (args) => searchIssuesStep({ apiKey, ...args }),
  });
