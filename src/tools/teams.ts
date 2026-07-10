import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import type { TeamListResponse, TeamResponse } from "../schemas";

const emptyInputSchema = z.object({});
const getTeamInputSchema = z.object({
  id: z.string().describe("Pylon team ID"),
});

async function listTeamsStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.teams.list();
}

export const listTeams = (
  apiKey: string,
): Tool<z.infer<typeof emptyInputSchema>, TeamListResponse> =>
  tool({
    description: "List Pylon teams and their users.",
    inputSchema: emptyInputSchema,
    execute: async () => listTeamsStep({ apiKey }),
  });

async function getTeamStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.teams.retrieve(id);
}

export const getTeam = (apiKey: string): Tool<z.infer<typeof getTeamInputSchema>, TeamResponse> =>
  tool({
    description: "Get a Pylon team by ID, including name and user references.",
    inputSchema: getTeamInputSchema,
    execute: async (args) => getTeamStep({ apiKey, ...args }),
  });
