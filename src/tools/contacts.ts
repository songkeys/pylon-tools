import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import { summarizePage, type PageSummary } from "../pagination";
import {
  cursorSchema,
  limitSchema,
  textSearchParamsSchema,
  type Contact,
  type ContactResponse,
  type TextSearchParams,
} from "../schemas";

const emptyInputSchema = z.object({});
const getContactInputSchema = z.object({
  cursor: cursorSchema,
  id: z.string().describe("Pylon contact ID"),
  limit: limitSchema,
});

async function listContactsStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return summarizePage(client.contacts.list());
}

export const listContacts = (
  apiKey: string,
): Tool<z.infer<typeof emptyInputSchema>, PageSummary<Contact>> =>
  tool({
    description:
      "List Pylon contacts for the organization, including account references, emails, portal roles, and custom fields.",
    inputSchema: emptyInputSchema,
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

export const getContact = (
  apiKey: string,
): Tool<z.infer<typeof getContactInputSchema>, ContactResponse> =>
  tool({
    description:
      "Get a Pylon contact by ID, including account reference, emails, portal role, and custom fields.",
    inputSchema: getContactInputSchema,
    execute: async (args) => getContactStep({ apiKey, ...args }),
  });

async function searchContactsStep({
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

  return summarizePage(client.contacts.search(params));
}

export const searchContacts = (
  apiKey: string,
): Tool<z.infer<typeof textSearchParamsSchema>, PageSummary<Contact>> =>
  tool({
    description:
      "Search Pylon contacts by filter. Useful for finding customers by email, name, account, or custom fields.",
    inputSchema: textSearchParamsSchema,
    execute: async (args) => searchContactsStep({ apiKey, ...args }),
  });
