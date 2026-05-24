# pylon-tools

Pylon tools for the [AI SDK](https://ai-sdk.dev). This package wraps the Pylon API as ready-to-use tools for `generateText`, `streamText`, and agent loops.

128 tools cover Pylon's public API: issues, messages, accounts, contacts, users, teams, knowledge bases, custom fields, custom objects, tags, surveys, tasks, projects, training data, audit logs, and more. Mutation tools require approval by default. The client is a small fetch wrapper with local Zod schemas and endpoint metadata derived from Pylon's public OpenAPI docs, so it does not depend on any generated SDK.

## Installation

```sh
pnpm add pylon-tools
```

`ai` and `zod` are peer dependencies:

```sh
pnpm add ai zod
```

## Quick Start

```ts
import { streamText } from "ai";
import { createPylonTools } from "pylon-tools";

const result = streamText({
  model,
  tools: createPylonTools({
    apiKey: process.env.PYLON_API_KEY,
    preset: "support",
    requireApproval: true,
  }),
  prompt: "Find recent Pylon issues for Acme and summarize the open blockers.",
});
```

You can omit `apiKey` when `PYLON_API_KEY` is set:

```ts
const tools = createPylonTools({ preset: "support" });
```

## Presets

Use `preset` to give the model only the tools relevant to a workflow:

```ts
// Support agent: issues, messages, attachments, customers, teammates, macros, tags
createPylonTools({ apiKey, preset: "support" });

// Account operations: accounts, contacts, activities, highlights, files
createPylonTools({ apiKey, preset: "accounts" });

// Knowledge operations: knowledge bases, articles, collections, training data
createPylonTools({ apiKey, preset: "knowledge" });

// Admin operations: custom fields, tags, teams, macros, audit logs
createPylonTools({ apiKey, preset: "admin" });

// People operations: contacts, users, teams, user roles, and token identity
createPylonTools({ apiKey, preset: "people" });

// Read-only exploration across every Pylon API area
createPylonTools({ apiKey, preset: "explorer" });

// Everything this package exposes
createPylonTools({ apiKey, preset: "all" });
```

Presets are composable:

```ts
createPylonTools({ apiKey, preset: ["accounts", "people"] });
```

| Preset      | Tools included                                                                           |
| ----------- | ---------------------------------------------------------------------------------------- |
| `support`   | Issues, messages, attachments, accounts, contacts, users, teams, tags, macros            |
| `accounts`  | Accounts, account highlights, activities, files, contacts, custom objects                |
| `people`    | Contacts, users, teams, user roles, and token identity                                   |
| `knowledge` | Knowledge bases, articles, collections, route redirects, feature requests, training data |
| `admin`     | Audit logs, custom fields, custom objects, tags, teams, macros, ticket forms             |
| `explorer`  | All read-only tools across Pylon API areas                                               |
| `all`       | All 128 tools                                                                            |

Omit `preset` to get all tools, same as `all`.

## Approval Control

Mutation tools require user approval by default. Read-only tools never require approval.

```ts
// Default: all mutation tools require approval
createPylonTools({ apiKey });

// Let mutation tools execute immediately
createPylonTools({ apiKey, requireApproval: false });

// Granular approval
createPylonTools({
  apiKey,
  preset: "support",
  requireApproval: {
    createIssueReply: false,
    createIssueNote: false,
    deleteIssue: true,
    redactIssueMessage: true,
  },
});
```

The same default applies when cherry-picking OpenAPI-backed endpoint tools directly with `createPylonEndpointTool` or `createPylonEndpointTools`. Pass `needsApproval: false` only when you intentionally want a specific mutation tool to run without approval.

Use `PylonWriteToolName` for a typed approval map:

```ts
import type { PylonWriteToolName } from "pylon-tools";

const requireApproval = {
  deleteAccount: true,
  updateAccount: false,
} satisfies Partial<Record<PylonWriteToolName, boolean>>;
```

## Cherry-Picking Tools

You can import individual tool factories for full control:

```ts
import { getIssue, searchAccounts } from "pylon-tools";

const apiKey = process.env.PYLON_API_KEY!;

const tools = {
  getIssue: getIssue(apiKey),
  searchAccounts: searchAccounts(apiKey),
};
```

For the broader OpenAPI-backed tools, use `createPylonEndpointTool` with a typed tool name:

```ts
import { createPylonEndpointTool } from "pylon-tools";

const createIssue = createPylonEndpointTool(apiKey, "createIssue", {
  needsApproval: true,
});
```

OpenAPI-backed tools use flat input objects. Path, query, and request-body fields from Pylon's docs become top-level tool arguments, so `createIssue` accepts fields such as `title`, `body_html`, `account_id`, and `requester_email` directly.

Each tool factory accepts a Pylon API key string. Tools use named module-level step functions with `"use step"` internally, which makes tool execution compatible with Vercel Workflow style durable steps.

## Agent Helper

Use `createPylonAgent` to get an AI SDK `ToolLoopAgent` with Pylon tools and preset-aware instructions:

```ts
import { createPylonAgent } from "pylon-tools";

const agent = createPylonAgent({
  model: "anthropic/claude-sonnet-4.6",
  apiKey: process.env.PYLON_API_KEY,
  preset: "support",
  requireApproval: true,
});

const result = await agent.generate({
  prompt: "Find recent Pylon issues for Acme and summarize the open blockers.",
});

const stream = agent.stream({
  prompt: "Which teams are involved in Acme's open issues?",
});
```

You can replace the built-in prompt with `instructions`, or append domain-specific context with `additionalInstructions`.

## Tool Overrides

The `overrides` option customizes AI SDK `tool()` metadata on a per-tool basis without replacing the underlying implementation.

```ts
import type { PylonToolName, ToolOverrides } from "pylon-tools";

const overrides = {
  searchIssues: {
    description: "Search Pylon issues for the current escalation workflow.",
  },
} satisfies Partial<Record<PylonToolName, ToolOverrides>>;

const tools = createPylonTools({ apiKey, preset: "support", overrides });
```

Supported override properties include `description`, `title`, `strict`, `needsApproval`, `providerOptions`, input streaming callbacks, and `toModelOutput`. Core properties such as `execute`, `inputSchema`, and `outputSchema` cannot be overridden.

## Tool Selection with toolpick

If you expose all tools to a broad agent, [toolpick](https://github.com/pontusab/toolpick) can select the most relevant subset for each step while keeping the full tool set callable:

```ts
import { createPylonTools } from "pylon-tools";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createToolIndex } from "toolpick";

const tools = createPylonTools({ apiKey, preset: "all" });
const index = createToolIndex(tools, {
  embeddingModel: openai.embeddingModel("text-embedding-3-small"),
});

const result = await generateText({
  model: openai("gpt-4o"),
  tools,
  prepareStep: index.prepareStep(),
  prompt: "Find Acme's open support issues and identify the related account owner.",
});
```

## Available Tools

The package exposes the original ergonomic read tools plus OpenAPI-backed tools for the complete public API surface.

| Area                 | Example tools                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts             | `listAccounts`, `getAccount`, `createAccount`, `updateAccount`, `deleteAccount`, `createAccountActivity`, `uploadAccountFile`, `createAccountHighlight`   |
| Contacts and users   | `listContacts`, `createContact`, `updateContact`, `deleteContact`, `listUsers`, `updateUser`, `listUserRoles`                                             |
| Issues and messages  | `listIssues`, `createIssue`, `updateIssue`, `deleteIssue`, `createIssueReply`, `createIssueNote`, `redactIssueMessage`, `listIssueVoiceCalls`             |
| Knowledge base       | `listKnowledgeBases`, `createKnowledgeBaseArticle`, `updateKnowledgeBaseArticle`, `requestKnowledgeBaseArticleReview`, `createKnowledgeBaseRouteRedirect` |
| Tasks and projects   | `listTasks`, `createTask`, `updateTask`, `createTaskComment`, `createProject`, `createMilestone`                                                          |
| Admin objects        | `listCustomFields`, `createCustomField`, `listCustomObjects`, `createCustomObject`, `listTags`, `createTag`, `listAuditLogs`                              |
| Training and imports | `createTrainingData`, `uploadTrainingDataFiles`, `uploadTrainingDataFileContent`, `importContact`, `importIssue`, `importIssueMessages`                   |
| Surveys and forms    | `listSurveys`, `searchSurveys`, `listSurveyResponses`, `listTicketForms`, `getTicketForm`                                                                 |

`ENDPOINT_DEFINITIONS` contains the OpenAPI-backed endpoint metadata if you want to inspect or build custom presets from the full tool list.

```ts
import { ENDPOINT_TOOL_NAMES, WRITE_ENDPOINT_TOOL_NAMES } from "pylon-tools";

console.log(ENDPOINT_TOOL_NAMES.length); // 112 OpenAPI-backed tools
console.log(WRITE_ENDPOINT_TOOL_NAMES.length); // 69 approval-gated mutation tools
```

## Pylon API Token

Create a Pylon API token in the Pylon dashboard and pass it as `apiKey`, or expose it as `PYLON_API_KEY`.

```sh
PYLON_API_KEY=your_token_here
```

The client authenticates with `Authorization: Bearer <token>`.

## Coverage

This package follows Pylon's public OpenAPI document and covers all 128 operations currently published there. Search endpoints are treated as read-only even when the API uses `POST`; create, update, delete, upload, import, reply, redact, snooze, and link operations are treated as mutation tools and are gated by `requireApproval` by default.

Multipart upload endpoints are exposed too. When calling them programmatically, pass fetch-compatible `Blob` or `File` values where the Pylon API expects files, or use `file_url` on endpoints that support URL-based upload.

## API

### `createPylonTools(options)`

Returns an object of AI SDK tools ready to pass to `tools`.

```ts
type PylonToolsOptions = {
  apiKey?: string; // defaults to process.env.PYLON_API_KEY
  requireApproval?: boolean | Partial<Record<PylonWriteToolName, boolean>>;
  preset?: PylonToolPreset | PylonToolPreset[];
  overrides?: Partial<Record<PylonToolName, ToolOverrides>>;
};

type PylonToolPreset =
  | "support"
  | "accounts"
  | "people"
  | "knowledge"
  | "admin"
  | "explorer"
  | "all";
```

### `createPylonAgent(options)`

Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods, pre-configured with Pylon tools and tailored instructions.

```ts
import { createPylonAgent } from "pylon-tools";

const agent = createPylonAgent({
  model: "anthropic/claude-sonnet-4.6",
  apiKey: process.env.PYLON_API_KEY,
  preset: "support",
  requireApproval: true,
  additionalInstructions: "Focus on enterprise escalations.",
});
```

| Option                   | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `model`                  | Language model string or provider instance             |
| `apiKey`                 | Pylon API key, defaults to `process.env.PYLON_API_KEY` |
| `preset`                 | Optional preset or array of presets to scope tools     |
| `requireApproval`        | Approval config, same as `createPylonTools`            |
| `instructions`           | Replaces the built-in system prompt entirely           |
| `additionalInstructions` | Appended to the built-in system prompt                 |

All other `ToolLoopAgent` options such as `stopWhen`, `toolChoice`, and `onStepFinish` are passed through.

### `createPylonClient(options)`

Returns the small fetch-backed client used by the tools. It is useful when you want typed Pylon API calls without constructing AI SDK tools.

```ts
import { createPylonClient } from "pylon-tools";

const client = createPylonClient({ apiKey: process.env.PYLON_API_KEY! });
const issue = await client.issues.retrieve("123");
```

For endpoints without a dedicated convenience method, use `requestEndpoint`:

```ts
await client.requestEndpoint("PATCH", "/users/123", {
  body: { status: "away" },
});
```

## Development

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm build
```

## Release

`bumpp` creates the version commit and `v*` tag, then GitHub Actions publishes the package.

For the first npm publish, create the package manually:

```sh
pnpm publish
```

Then configure npm Trusted Publisher for the package at `https://www.npmjs.com/package/pylon-tools/access` and connect it to this GitHub repository.

For future releases:

```sh
pnpm run release
```

Choose the version bump, let `bumpp` push the commit and tag, and the `Release` GitHub Actions workflow will publish the tagged version to npm.

## License

MIT
