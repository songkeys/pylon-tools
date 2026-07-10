import { ToolLoopAgent, type ToolLoopAgentSettings } from "ai";
import {
  createPylonToolApproval,
  createPylonTools,
  type PylonToolPreset,
  type PylonToolApprovalConfig,
  type PylonToolsOptions,
} from "./index";

const DEFAULT_INSTRUCTIONS =
  "You are a helpful Pylon assistant. You can read and manage issues, messages, accounts, contacts, users, teams, knowledge bases, tasks, tags, custom fields, and related Pylon records. Be careful with mutation tools because they may require user approval.";

const PRESET_INSTRUCTIONS: Record<PylonToolPreset, string> = {
  accounts:
    "You are a Pylon account operations assistant. Help users understand and manage accounts, contacts, domains, ownership, tags, custom fields, highlights, activities, files, and custom objects.",
  admin:
    "You are a Pylon admin assistant. Help users manage custom fields, custom objects, tags, teams, user roles, macros, ticket forms, training data, and audit-log investigation.",
  all: DEFAULT_INSTRUCTIONS,
  explorer:
    "You are a read-only Pylon explorer. Help users inspect and understand issues, messages, accounts, contacts, users, teams, knowledge bases, surveys, tasks, audit logs, tags, custom fields, and related records without making changes.",
  knowledge:
    "You are a Pylon knowledge assistant. Help users manage knowledge bases, collections, articles, route redirects, feature requests, and training data.",
  people:
    "You are a Pylon people assistant. Help users find and manage contacts, internal users, teams, user roles, and the organization associated with the API token.",
  support:
    "You are a Pylon support assistant. Help users investigate issues, summarize blockers, create replies or internal notes, manage assignees, followers, linked external issues, tags, teams, accounts, contacts, and related customer context.",
};

export function resolveInstructions(options: {
  additionalInstructions?: string | undefined;
  instructions?: string | undefined;
  preset?: PylonToolPreset | PylonToolPreset[] | undefined;
}): string {
  const defaultPrompt =
    options.preset && !Array.isArray(options.preset)
      ? PRESET_INSTRUCTIONS[options.preset]
      : DEFAULT_INSTRUCTIONS;

  if (options.instructions) return options.instructions;
  if (options.additionalInstructions)
    return `${defaultPrompt}\n\n${options.additionalInstructions}`;
  return defaultPrompt;
}

type AgentOptions = Omit<
  ToolLoopAgentSettings,
  "instructions" | "model" | "toolApproval" | "tools"
>;

export type CreatePylonAgentOptions = AgentOptions & {
  model: ToolLoopAgentSettings["model"];
  /**
   * Pylon API key. Falls back to `process.env.PYLON_API_KEY` when omitted.
   */
  apiKey?: string;
  preset?: PylonToolPreset | PylonToolPreset[];
  /**
   * AI SDK 7 approval policy for Pylon mutation tools.
   * Defaults to `"user-approval"` for every mutation tool.
   */
  toolApproval?: PylonToolApprovalConfig;
  /** @deprecated Use `toolApproval` instead. */
  requireApproval?: PylonToolApprovalConfig;
  instructions?: string;
  additionalInstructions?: string;
};

export function createPylonAgent({
  apiKey,
  preset,
  toolApproval,
  requireApproval,
  instructions,
  additionalInstructions,
  ...agentOptions
}: CreatePylonAgentOptions): ToolLoopAgent {
  const toolsOptions: PylonToolsOptions = {};

  if (apiKey !== undefined) toolsOptions.apiKey = apiKey;
  if (preset !== undefined) toolsOptions.preset = preset;
  return new ToolLoopAgent({
    ...agentOptions,
    tools: createPylonTools(toolsOptions),
    toolApproval: createPylonToolApproval(toolApproval ?? requireApproval),
    instructions: resolveInstructions({ additionalInstructions, instructions, preset }),
  });
}
