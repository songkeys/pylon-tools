import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage } from "../pagination";
import { searchParamsSchema, type SearchFilter } from "../schemas";

async function listUsersStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.users.list();
}

export const listUsers = (apiKey: string) =>
  tool({
    description: "List Pylon users, including names, emails, roles, and statuses.",
    inputSchema: z.object({}),
    execute: async () => listUsersStep({ apiKey }),
  });

async function getUserStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.users.retrieve(id);
}

export const getUser = (apiKey: string) =>
  tool({
    description: "Get a Pylon user by ID, including name, email, role ID, avatar, and status.",
    inputSchema: z.object({
      id: z.string().describe("Pylon user ID"),
    }),
    execute: async (args) => getUserStep({ apiKey, ...args }),
  });

async function searchUsersStep({
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

  return summarizePage(client.users.search(params));
}

export const searchUsers = (apiKey: string) =>
  tool({
    description:
      "Search Pylon users by filter. Useful for finding teammates by email, name, role, or status.",
    inputSchema: searchParamsSchema,
    execute: async (args) => searchUsersStep({ apiKey, ...args }),
  });
