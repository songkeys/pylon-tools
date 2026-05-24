import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage } from "../pagination";
import { cursorSchema, limitSchema, searchParamsSchema, type SearchFilter } from "../schemas";

async function listContactsStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return summarizePage(client.contacts.list());
}

export const listContacts = (apiKey: string) =>
  tool({
    description:
      "List Pylon contacts for the organization, including account references, emails, portal roles, and custom fields.",
    inputSchema: z.object({}),
    execute: async () => listContactsStep({ apiKey }),
  });

async function getContactStep({
  apiKey,
  cursor,
  id,
  limit,
}: {
  apiKey: string;
  cursor?: string | undefined;
  id: string;
  limit: number;
}) {
  "use step";
  const client = createPylonClient(apiKey);
  const params = cursor === undefined ? { limit } : { cursor, limit };

  return client.contacts.retrieve(id, params);
}

export const getContact = (apiKey: string) =>
  tool({
    description:
      "Get a Pylon contact by ID, including account reference, emails, portal role, and custom fields.",
    inputSchema: z.object({
      cursor: cursorSchema,
      id: z.string().describe("Pylon contact ID"),
      limit: limitSchema,
    }),
    execute: async (args) => getContactStep({ apiKey, ...args }),
  });

async function searchContactsStep({
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

  return summarizePage(client.contacts.search(params));
}

export const searchContacts = (apiKey: string) =>
  tool({
    description:
      "Search Pylon contacts by filter. Useful for finding customers by email, name, account, or custom fields.",
    inputSchema: searchParamsSchema,
    execute: async (args) => searchContactsStep({ apiKey, ...args }),
  });
