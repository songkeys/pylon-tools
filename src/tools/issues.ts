import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage, type PageSummary } from "../pagination";
import {
  textSearchParamsSchema,
  type Issue,
  type IssueFollowersResponse,
  type IssueResponse,
  type TextSearchParams,
} from "../schemas";

const getIssueInputSchema = z.object({
  id: z.string().describe("Pylon issue ID or issue number"),
});
const listIssuesInputSchema = z.object({
  endTime: z.string().describe("End of the issue creation window as an RFC3339 timestamp"),
  startTime: z.string().describe("Start of the issue creation window as an RFC3339 timestamp"),
});

async function getIssueStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.issues.retrieve(id);
}

export const getIssue = (
  apiKey: string,
): Tool<z.infer<typeof getIssueInputSchema>, IssueResponse> =>
  tool({
    description:
      "Get a Pylon issue by its ID or number, including title, state, source, requester, account, tags, and timing metadata.",
    inputSchema: getIssueInputSchema,
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

export const listIssues = (
  apiKey: string,
): Tool<z.infer<typeof listIssuesInputSchema>, PageSummary<Issue>> =>
  tool({
    description:
      "List Pylon issues in a time window. The start and end time must be RFC3339 timestamps no more than 30 days apart.",
    inputSchema: listIssuesInputSchema,
    execute: async (args) => listIssuesStep({ apiKey, ...args }),
  });

async function listIssueFollowersStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.issues.listFollowers(id);
}

export const listIssueFollowers = (
  apiKey: string,
): Tool<z.infer<typeof getIssueInputSchema>, IssueFollowersResponse> =>
  tool({
    description: "List followers for a Pylon issue by issue ID or issue number.",
    inputSchema: getIssueInputSchema,
    execute: async (args) => listIssueFollowersStep({ apiKey, ...args }),
  });

async function searchIssuesStep({
  apiKey,
  cursor,
  filter,
  limit,
  search_text,
}: {
  apiKey: string;
  cursor?: string | undefined;
  filter: TextSearchParams["filter"];
  limit: number;
  search_text?: string | undefined;
}) {
  "use step";
  const client = createPylonClient(apiKey);
  const params = {
    filter,
    limit,
    ...(cursor === undefined ? {} : { cursor }),
    ...(search_text === undefined ? {} : { search_text }),
  };

  return summarizePage(client.issues.search(params));
}

export const searchIssues = (
  apiKey: string,
): Tool<z.infer<typeof textSearchParamsSchema>, PageSummary<Issue>> =>
  tool({
    description:
      "Search Pylon issues by filter. Useful for finding support cases by state, account, requester, tag, source, team, or custom fields.",
    inputSchema: textSearchParamsSchema,
    execute: async (args) => searchIssuesStep({ apiKey, ...args }),
  });
