import { tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";

async function getMeStep({ apiKey }: { apiKey: string }) {
  "use step";
  const client = createPylonClient(apiKey);
  return client.me.retrieve();
}

export const getMe = (apiKey: string) =>
  tool({
    description:
      "Get the authenticated Pylon user for the configured API key. Useful for checking whether the token is valid.",
    inputSchema: z.object({}),
    execute: async () => getMeStep({ apiKey }),
  });
