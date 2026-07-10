import type { ToolApprovalStatus } from "ai";
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
  WRITE_ENDPOINT_TOOL_NAMES,
  type EndpointToolName,
  type WriteEndpointToolName,
} from "./endpoint-definitions";
import { sanitizeToolOverrides } from "./tool-overrides";
import { createPylonEndpointTools, type PylonEndpointTools } from "./tools/endpoints";
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
export type PylonToolApproval = Record<PylonWriteToolName, ToolApprovalStatus>;
export type PylonToolPreset =
  | "accounts"
  | "admin"
  | "all"
  | "explorer"
  | "knowledge"
  | "people"
  | "support";

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
const READ_TOOLS = [
  ...ISSUE_TOOLS,
  ...ACCOUNT_TOOLS,
  ...CONTACT_TOOLS,
  ...USER_TOOLS,
  ...TEAM_TOOLS,
  ...IDENTITY_TOOLS,
] as const;
const READ_ENDPOINT_TOOLS = ENDPOINT_DEFINITIONS.filter((endpoint) => !endpoint.mutates).map(
  (endpoint) => endpoint.name,
) as ReadEndpointToolName[];

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
  explorer: [...READ_TOOLS, ...READ_ENDPOINT_TOOLS],
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

type PylonToolMap = {
  getAccount: ReturnType<typeof getAccount>;
  getContact: ReturnType<typeof getContact>;
  getIssue: ReturnType<typeof getIssue>;
  getMe: ReturnType<typeof getMe>;
  getTeam: ReturnType<typeof getTeam>;
  getUser: ReturnType<typeof getUser>;
  listAccounts: ReturnType<typeof listAccounts>;
  listContacts: ReturnType<typeof listContacts>;
  listIssueFollowers: ReturnType<typeof listIssueFollowers>;
  listIssues: ReturnType<typeof listIssues>;
  listTeams: ReturnType<typeof listTeams>;
  listUsers: ReturnType<typeof listUsers>;
  searchAccounts: ReturnType<typeof searchAccounts>;
  searchContacts: ReturnType<typeof searchContacts>;
  searchIssues: ReturnType<typeof searchIssues>;
  searchUsers: ReturnType<typeof searchUsers>;
} & PylonEndpointTools;
type ReadEndpointToolName = Extract<
  (typeof ENDPOINT_DEFINITIONS)[number],
  { readonly mutates: false }
>["name"] &
  EndpointToolName;
type EndpointDefinitionForResource<Resource extends string> =
  (typeof ENDPOINT_DEFINITIONS)[number] extends infer Definition
    ? Definition extends { readonly name: infer Name; readonly resource: Resource }
      ? Name
      : never
    : never;
type EndpointToolNamesForResources<Resources extends readonly string[]> = Extract<
  EndpointDefinitionForResource<Resources[number]>,
  EndpointToolName
>[];
export type PylonPresetTools<Preset extends PylonToolPreset> = Pick<
  PylonToolMap,
  Extract<(typeof PRESET_TOOLS)[Preset][number], keyof PylonToolMap>
>;
export type PylonPresetArrayTools<Presets extends readonly PylonToolPreset[]> = Pick<
  PylonToolMap,
  Extract<(typeof PRESET_TOOLS)[Presets[number]][number], keyof PylonToolMap>
>;

function endpointToolNamesFor<const Resources extends readonly string[]>(
  resources: Resources,
): EndpointToolNamesForResources<Resources> {
  const resourceSet = new Set(resources);

  return ENDPOINT_DEFINITIONS.filter((endpoint) => resourceSet.has(endpoint.resource)).map(
    (endpoint) => endpoint.name,
  ) as EndpointToolNamesForResources<Resources>;
}

export type PylonToolsOptions = {
  /**
   * Pylon API key. Falls back to `process.env.PYLON_API_KEY` when omitted.
   */
  apiKey?: string;
  /**
   * Per-tool overrides for customizing metadata such as description, title,
   * providerOptions, and input callbacks. `execute`, `inputSchema`, and
   * `outputSchema` cannot be overridden.
   */
  overrides?: Partial<Record<PylonToolName, ToolOverrides>>;
  /**
   * Restrict the returned tools to a predefined preset.
   * Omit to get all tools.
   */
  preset?: PylonToolPreset | PylonToolPreset[];
};

function createAllPylonTools(resolvedApiKey: string): PylonToolMap {
  return {
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
    ...createPylonEndpointTools(resolvedApiKey),
  };
}

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

export function createPylonTools(options?: Omit<PylonToolsOptions, "preset">): PylonToolMap;
export function createPylonTools(
  options: Omit<PylonToolsOptions, "preset"> & { preset: "all" },
): PylonToolMap;
export function createPylonTools<Preset extends Exclude<PylonToolPreset, "all">>(
  options: Omit<PylonToolsOptions, "preset"> & { preset: Preset },
): PylonPresetTools<Preset>;
export function createPylonTools<const Presets extends readonly PylonToolPreset[]>(
  options: Omit<PylonToolsOptions, "preset"> & { preset: Presets },
): PylonPresetArrayTools<Presets>;
export function createPylonTools({ apiKey, overrides, preset }: PylonToolsOptions = {}):
  | PylonToolMap
  | Partial<PylonToolMap> {
  const resolvedApiKey = resolvePylonApiKey(apiKey);
  const allowed = resolvePresetTools(preset);
  const allTools = createAllPylonTools(resolvedApiKey);

  if (overrides) {
    for (const [name, toolOverrides] of Object.entries(overrides)) {
      if (name in allTools && toolOverrides) {
        const key = name as keyof typeof allTools;
        Object.assign(allTools, {
          [key]: { ...allTools[key], ...sanitizeToolOverrides(toolOverrides) },
        });
      }
    }
  }

  if (!allowed) return allTools;

  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => allowed.has(name as PylonToolName)),
  ) as Partial<typeof allTools>;
}

export function createPylonToolApproval(config: ApprovalConfig = true): PylonToolApproval {
  return Object.fromEntries(
    WRITE_ENDPOINT_TOOL_NAMES.map((name) => [
      name,
      resolveApproval(name, config) ? "user-approval" : "approved",
    ]),
  ) as PylonToolApproval;
}

function resolveApproval(name: PylonWriteToolName, config: ApprovalConfig): boolean {
  if (typeof config === "boolean") return config;
  return config[name] ?? true;
}

export type PylonTools = PylonToolMap;

export {
  PylonApiError,
  PylonClient,
  PylonResponseValidationError,
  createPylonClient,
} from "./client";
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
  TextSearchParams,
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
