import { tool, type Tool } from "ai";
import { z } from "zod";
import { createPylonClient } from "../client";
import {
  ENDPOINT_DEFINITIONS,
  WRITE_ENDPOINT_TOOL_NAMES,
  type EndpointDefinition,
  type EndpointToolName,
  type FieldDefinition,
  type FieldKind,
  type WriteEndpointToolName,
} from "../endpoint-definitions";
import { sanitizeToolOverrides } from "../tool-overrides";
import type { ToolOverrides } from "../types";

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
const WRITE_TOOL_NAME_SET = new Set<string>(WRITE_ENDPOINT_TOOL_NAMES);
const fileSchema = z.any().describe("Fetch-compatible Blob or File value for multipart upload");

type EndpointInput = Record<string, unknown>;

export type PylonEndpointTools = Record<EndpointToolName, Tool>;

async function executeEndpointStep({
  apiKey,
  definition,
  input,
}: {
  apiKey: string;
  definition: EndpointDefinition;
  input: EndpointInput;
}) {
  "use step";
  const client = createPylonClient(apiKey);
  const { body, path, query } = splitEndpointInput(definition, input);
  const options: {
    body?: unknown;
    bodyContentType?: "application/json" | "multipart/form-data" | undefined;
    query?: Record<string, unknown>;
  } = {};

  if (body !== undefined) {
    options.body = body;
    options.bodyContentType = definition.bodyContentType;
  }
  if (query !== undefined) options.query = query;

  return client.requestEndpoint(definition.method, path, options);
}

export function createPylonEndpointTools(
  apiKey: string,
  approvalFor?: ((name: WriteEndpointToolName) => ToolOverrides) | undefined,
): PylonEndpointTools {
  const entries = ENDPOINT_DEFINITIONS.map((definition) => {
    const approval =
      approvalFor && isWriteEndpointToolName(definition.name)
        ? approvalFor(definition.name)
        : undefined;

    return [definition.name, createPylonEndpointTool(apiKey, definition.name, approval)] as const;
  });

  return Object.fromEntries(entries) as PylonEndpointTools;
}

export function createPylonEndpointTool(
  apiKey: string,
  name: EndpointToolName,
  options: ToolOverrides = {},
) {
  const definition = ENDPOINT_DEFINITIONS.find((endpoint) => endpoint.name === name);

  if (!definition) {
    throw new Error(`Unknown Pylon endpoint tool: ${name}`);
  }

  const safeOptions = sanitizeToolOverrides(options);

  if (isWriteEndpointToolName(name) && safeOptions.needsApproval === undefined) {
    safeOptions.needsApproval = true;
  }

  return createEndpointTool(apiKey, definition, safeOptions);
}

function createEndpointTool(
  apiKey: string,
  definition: EndpointDefinition,
  options: ToolOverrides = {},
) {
  return tool({
    description: describeEndpoint(definition),
    inputSchema: inputSchemaFor(definition),
    execute: async (input) => executeEndpointStep({ apiKey, definition, input }),
    ...sanitizeToolOverrides(options),
  });
}

function inputSchemaFor(definition: EndpointDefinition) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of pathFieldsFor(definition)) {
    addInputField(shape, field, "path");
  }

  for (const field of definition.queryFields ?? []) {
    addInputField(shape, field, "query");
  }

  for (const field of definition.bodyFields ?? []) {
    addInputField(shape, field, "body");
  }

  return z.object(shape);
}

function addInputField(
  shape: Record<string, z.ZodTypeAny>,
  [name, kind, required]: FieldDefinition,
  location: "body" | "path" | "query",
) {
  const label = `${location} ${kind}${required ? ", required" : ""}`;
  const schema = schemaForKind(kind).describe(`${name} (${label})`);
  shape[name] = required ? schema : schema.optional();
}

function schemaForKind(kind: FieldKind): z.ZodTypeAny {
  switch (kind) {
    case "array":
      return z.array(jsonValueSchema);
    case "boolean":
      return z.boolean();
    case "file":
      return fileSchema;
    case "fileArray":
      return z.array(fileSchema);
    case "integer":
      return z.number().int();
    case "number":
      return z.number();
    case "object":
      return jsonObjectSchema;
    case "string":
      return z.string();
  }
}

function splitEndpointInput(definition: EndpointDefinition, input: EndpointInput) {
  const path = pathFieldsFor(definition).reduce(
    (currentPath, [name]) =>
      currentPath.replace(`{${name}}`, encodeURIComponent(String(input[name]))),
    definition.path,
  );
  const query = collectFields(definition.queryFields, input);
  const body = collectFields(definition.bodyFields, input);

  return {
    body: body === undefined ? undefined : body,
    path,
    query,
  };
}

function collectFields(
  fields: readonly FieldDefinition[] | undefined,
  input: EndpointInput,
): Record<string, unknown> | undefined {
  if (!fields?.length) return undefined;

  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const [name] = field;
    const value = input[name];
    if (value !== undefined) values[name] = validateEndpointField(field, value);
  }

  return Object.keys(values).length === 0 ? undefined : values;
}

function validateEndpointField([name, kind]: FieldDefinition, value: unknown) {
  if (kind === "file" && !isBlob(value)) {
    throw new Error(`${name} must be a fetch-compatible Blob or File.`);
  }

  if (kind === "fileArray") {
    if (!Array.isArray(value) || value.some((item) => !isBlob(item))) {
      throw new Error(`${name} must be an array of fetch-compatible Blob or File values.`);
    }
  }

  return value;
}

function pathFieldsFor(definition: EndpointDefinition): FieldDefinition[] {
  return Array.from(definition.path.matchAll(/\{([^}]+)\}/g), (match) => [
    match[1] ?? "",
    "string",
    true,
  ]);
}

function describeEndpoint(definition: EndpointDefinition): string {
  const fields = [
    ...pathFieldsFor(definition).map(([name]) => name),
    ...(definition.queryFields ?? []).map(([name]) => name),
    ...(definition.bodyFields ?? []).map(([name]) => name),
  ];
  const fieldSummary = fields.length ? ` Inputs: ${fields.join(", ")}.` : "";

  return `${definition.summary}. Calls ${definition.method} ${definition.path}.${fieldSummary}`;
}

function isWriteEndpointToolName(name: string): name is WriteEndpointToolName {
  return WRITE_TOOL_NAME_SET.has(name);
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}
