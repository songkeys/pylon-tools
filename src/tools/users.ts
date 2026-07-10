import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage, type PageSummary } from "../pagination";
import {
  searchParamsSchema,
  userSchema,
  type SearchFilter,
  type UserListResponse,
  type UserResponse,
} from "../schemas";

const emptyInputSchema = z.object({});
const getUserInputSchema = z.object({
  id: z.string().describe("Pylon user ID"),
});

async function listUsersStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.users.list();
}

export const listUsers = (
  apiKey: string,
): Tool<z.infer<typeof emptyInputSchema>, UserListResponse> =>
  tool({
    description: "List Pylon users, including names, emails, roles, and statuses.",
    inputSchema: emptyInputSchema,
    execute: async () => listUsersStep({ apiKey }),
  });

async function getUserStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.users.retrieve(id);
}

export const getUser = (apiKey: string): Tool<z.infer<typeof getUserInputSchema>, UserResponse> =>
  tool({
    description: "Get a Pylon user by ID, including name, email, role ID, avatar, and status.",
    inputSchema: getUserInputSchema,
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

export const searchUsers = (
  apiKey: string,
): Tool<z.infer<typeof searchParamsSchema>, PageSummary<z.infer<typeof userSchema>>> =>
  tool({
    description:
      "Search Pylon users by filter. Useful for finding teammates by email, name, role, or status.",
    inputSchema: searchParamsSchema,
    execute: async (args) => searchUsersStep({ apiKey, ...args }),
  });
