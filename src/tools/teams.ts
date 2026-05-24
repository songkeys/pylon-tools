import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";

async function listTeamsStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.teams.list();
}

export const listTeams = (apiKey: string) =>
  tool({
    description: "List Pylon teams and their users.",
    inputSchema: z.object({}),
    execute: async () => listTeamsStep({ apiKey }),
  });

async function getTeamStep({ apiKey, id }: { apiKey: string; id: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.teams.retrieve(id);
}

export const getTeam = (apiKey: string) =>
  tool({
    description: "Get a Pylon team by ID, including name and user references.",
    inputSchema: z.object({
      id: z.string().describe("Pylon team ID"),
    }),
    execute: async (args) => getTeamStep({ apiKey, ...args }),
  });
