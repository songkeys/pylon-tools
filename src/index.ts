import { getAccount, listAccounts, searchAccounts } from "./tools/accounts";
import { getContact, listContacts, searchContacts } from "./tools/contacts";
import { getIssue, listIssueFollowers, listIssues, searchIssues } from "./tools/issues";
import { getMe } from "./tools/me";
import { getTeam, listTeams } from "./tools/teams";
import { getUser, listUsers, searchUsers } from "./tools/users";
import { resolvePylonApiKey } from "./client";
import {
  ENDPOINT_DEFINITIONS,
  ENDPOINT_TOOL_NAMES,
  type EndpointToolName,
  type WriteEndpointToolName,
} from "./endpoint-definitions";
import { createPylonEndpointTools } from "./tools/endpoints";
import type { ToolOverrides } from "./types";

const ISSUE_TOOLS = ["getIssue", "listIssues", "searchIssues", "listIssueFollowers"] as const;
const ACCOUNT_TOOLS = ["getAccount", "listAccounts", "searchAccounts"] as const;
const CONTACT_TOOLS = ["getContact", "listContacts", "searchContacts"] as const;
const USER_TOOLS = ["getUser", "listUsers", "searchUsers"] as const;
const TEAM_TOOLS = ["getTeam", "listTeams"] as const;
const IDENTITY_TOOLS = ["getMe"] as const;

const ALL_TOOL_NAMES = [
  ...ISSUE_TOOLS,
  ...ACCOUNT_TOOLS,
  ...CONTACT_TOOLS,
  ...USER_TOOLS,
  ...TEAM_TOOLS,
  ...IDENTITY_TOOLS,
  ...ENDPOINT_TOOL_NAMES,
] as const;

export type PylonToolName = (typeof ALL_TOOL_NAMES)[number];
export type PylonWriteToolName = WriteEndpointToolName;
export type ApprovalConfig = boolean | Partial<Record<PylonWriteToolName, boolean>>;
export type PylonToolPreset = "accounts" | "admin" | "all" | "knowledge" | "people" | "support";

const ACCOUNT_ENDPOINT_TOOLS = endpointToolNamesFor([
  "account-highlights",
  "accounts",
  "activity-types",
  "custom-objects",
]);
const CONTACT_ENDPOINT_TOOLS = endpointToolNamesFor(["contacts"]);
const SUPPORT_ENDPOINT_TOOLS = endpointToolNamesFor([
  "accounts",
  "attachments",
  "call-recordings",
  "contacts",
  "feature-requests",
  "import",
  "issue-statuses",
  "issues",
  "macros",
  "messages",
  "tags",
  "teams",
  "ticket-forms",
  "voice_calls",
]);
const KNOWLEDGE_ENDPOINT_TOOLS = endpointToolNamesFor([
  "articles",
  "collections",
  "feature-requests",
  "knowledge-bases",
  "route-redirects",
  "training-data",
]);
const ADMIN_ENDPOINT_TOOLS = endpointToolNamesFor([
  "audit_logs",
  "custom-fields",
  "custom-objects",
  "macros",
  "tags",
  "teams",
  "ticket-forms",
  "training-data",
  "user",
  "user-roles",
]);
const PEOPLE_ENDPOINT_TOOLS = endpointToolNamesFor(["contacts", "teams", "user", "user-roles"]);

const PRESET_TOOLS = {
  accounts: [
    ...ACCOUNT_TOOLS,
    ...CONTACT_TOOLS,
    ...IDENTITY_TOOLS,
    ...ACCOUNT_ENDPOINT_TOOLS,
    ...CONTACT_ENDPOINT_TOOLS,
  ],
  admin: [...IDENTITY_TOOLS, ...ADMIN_ENDPOINT_TOOLS],
  all: ALL_TOOL_NAMES,
  knowledge: [...IDENTITY_TOOLS, ...KNOWLEDGE_ENDPOINT_TOOLS],
  people: [
    ...CONTACT_TOOLS,
    ...USER_TOOLS,
    ...TEAM_TOOLS,
    ...IDENTITY_TOOLS,
    ...PEOPLE_ENDPOINT_TOOLS,
  ],
  support: [
    ...ISSUE_TOOLS,
    ...ACCOUNT_TOOLS,
    ...CONTACT_TOOLS,
    ...USER_TOOLS,
    ...TEAM_TOOLS,
    ...IDENTITY_TOOLS,
    ...SUPPORT_ENDPOINT_TOOLS,
  ],
} as const satisfies Record<PylonToolPreset, readonly PylonToolName[]>;

function endpointToolNamesFor(resources: readonly string[]): EndpointToolName[] {
  const resourceSet = new Set(resources);

  return ENDPOINT_DEFINITIONS.filter((endpoint) => resourceSet.has(endpoint.resource)).map(
    (endpoint) => endpoint.name,
  ) as EndpointToolName[];
}

export type PylonToolsOptions = {
  /**
   * Pylon API key. Falls back to `process.env.PYLON_API_KEY` when omitted.
   */
  apiKey?: string;
  /**
   * Whether mutation tools require user approval.
   * Defaults to `true`. Read-only tools never require approval.
   */
  requireApproval?: ApprovalConfig;
  /**
   * Per-tool overrides for customizing metadata such as description, title,
   * needsApproval, and providerOptions. `execute`, `inputSchema`, and
   * `outputSchema` cannot be overridden.
   */
  overrides?: Partial<Record<PylonToolName, ToolOverrides>>;
  /**
   * Restrict the returned tools to a predefined preset.
   * Omit to get all tools.
   */
  preset?: PylonToolPreset | PylonToolPreset[];
};

function resolvePresetTools(
  preset?: PylonToolPreset | PylonToolPreset[],
): Set<PylonToolName> | null {
  if (!preset) return null;

  const presets = Array.isArray(preset) ? preset : [preset];
  const tools = new Set<PylonToolName>();

  for (const name of presets) {
    for (const toolName of PRESET_TOOLS[name]) tools.add(toolName);
  }

  return tools;
}

export function createPylonTools({
  apiKey,
  overrides,
  preset,
  requireApproval = true,
}: PylonToolsOptions = {}) {
  const resolvedApiKey = resolvePylonApiKey(apiKey);
  const allowed = resolvePresetTools(preset);
  const approval = (name: PylonWriteToolName) => ({
    needsApproval: resolveApproval(name, requireApproval),
  });

  const allTools = {
    getAccount: getAccount(resolvedApiKey),
    getContact: getContact(resolvedApiKey),
    getIssue: getIssue(resolvedApiKey),
    getMe: getMe(resolvedApiKey),
    getTeam: getTeam(resolvedApiKey),
    getUser: getUser(resolvedApiKey),
    listAccounts: listAccounts(resolvedApiKey),
    listContacts: listContacts(resolvedApiKey),
    listIssueFollowers: listIssueFollowers(resolvedApiKey),
    listIssues: listIssues(resolvedApiKey),
    listTeams: listTeams(resolvedApiKey),
    listUsers: listUsers(resolvedApiKey),
    searchAccounts: searchAccounts(resolvedApiKey),
    searchContacts: searchContacts(resolvedApiKey),
    searchIssues: searchIssues(resolvedApiKey),
    searchUsers: searchUsers(resolvedApiKey),
    ...createPylonEndpointTools(resolvedApiKey, approval),
  };

  if (overrides) {
    for (const [name, toolOverrides] of Object.entries(overrides)) {
      if (name in allTools && toolOverrides) {
        const key = name as keyof typeof allTools;
        Object.assign(allTools, { [key]: { ...allTools[key], ...toolOverrides } });
      }
    }
  }

  if (!allowed) return allTools;

  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => allowed.has(name as PylonToolName)),
  ) as Partial<typeof allTools>;
}

function resolveApproval(name: PylonWriteToolName, config: ApprovalConfig = true): boolean {
  if (typeof config === "boolean") return config;
  return config[name] ?? true;
}

export type PylonTools = ReturnType<typeof createPylonTools>;

export { PylonApiError, PylonClient, createPylonClient } from "./client";
export type { PylonClientOptions, PylonHttpMethod } from "./client";
export { createPylonAgent } from "./agents";
export type { CreatePylonAgentOptions } from "./agents";
export type {
  Account,
  AccountPage,
  AccountResponse,
  Contact,
  ContactPage,
  ContactResponse,
  GenericResponse,
  Issue,
  IssueFollower,
  IssueFollowersResponse,
  IssuePage,
  IssueResponse,
  MeResponse,
  SearchFilter,
  SearchParams,
  TeamListResponse,
  TeamResponse,
  UserListResponse,
  UserPage,
  UserResponse,
} from "./schemas";
export {
  ENDPOINT_DEFINITIONS,
  ENDPOINT_TOOL_NAMES,
  WRITE_ENDPOINT_TOOL_NAMES,
} from "./endpoint-definitions";
export type { EndpointToolName, WriteEndpointToolName } from "./endpoint-definitions";
export { createPylonEndpointTool, createPylonEndpointTools } from "./tools/endpoints";
export { getAccount, listAccounts, searchAccounts } from "./tools/accounts";
export { getContact, listContacts, searchContacts } from "./tools/contacts";
export { getIssue, listIssueFollowers, listIssues, searchIssues } from "./tools/issues";
export { getMe } from "./tools/me";
export { getTeam, listTeams } from "./tools/teams";
export { getUser, listUsers, searchUsers } from "./tools/users";
export type { ToolOverrides } from "./types";
