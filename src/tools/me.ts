import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import type { MeResponse } from "../schemas";

const emptyInputSchema = z.object({});

async function getMeStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.me.retrieve();
}

export const getMe = (apiKey: string): Tool<z.infer<typeof emptyInputSchema>, MeResponse> =>
  tool({
    description:
      "Get the authenticated Pylon user for the configured API key. Useful for checking whether the token is valid.",
    inputSchema: emptyInputSchema,
    execute: async () => getMeStep({ apiKey }),
  });
