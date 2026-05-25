import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage } from "../pagination";
import {
  cursorSchema,
  limitSchema,
  textSearchParamsSchema,
  type TextSearchParams,
} from "../schemas";

async function getAccountStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.accounts.retrieve(id);
}

export const getAccount = (apiKey: string) =>
  tool({
    description:
      "Get a Pylon account by its ID or external ID, including domains, tags, owner, and custom fields.",
    inputSchema: z.object({
      id: z.string().describe("Pylon account ID or external ID"),
    }),
    execute: async (args) => getAccountStep({ apiKey, ...args }),
  });

async function listAccountsStep({
  apiKey,
  cursor,
  limit,
}: {
  apiKey: string;
  cursor?: string | undefined;
  limit: number;
}) {
  "use step";
  const client = createPylonClient(apiKey);
  const params = cursor === undefined ? { limit } : { cursor, limit };

  return summarizePage(client.accounts.list(params));
}

export const listAccounts = (apiKey: string) =>
  tool({
    description:
      "List Pylon accounts with pagination. Use this when browsing accounts without a precise search filter.",
    inputSchema: z.object({
      cursor: cursorSchema,
      limit: limitSchema,
    }),
    execute: async (args) => listAccountsStep({ apiKey, ...args }),
  });

async function searchAccountsStep({
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

  return summarizePage(client.accounts.search(params));
}

export const searchAccounts = (apiKey: string) =>
  tool({
    description:
      "Search Pylon accounts by filter. Useful for finding customer accounts by domain, name, tags, or custom fields.",
    inputSchema: textSearchParamsSchema,
    execute: async (args) => searchAccountsStep({ apiKey, ...args }),
  });
