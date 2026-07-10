import type { ToolOverrides } from "./types";

const TOOL_OVERRIDE_KEYS = [
  "description",
  "onInputAvailable",
  "onInputDelta",
  "onInputStart",
  "providerOptions",
  "strict",
  "title",
  "toModelOutput",
] as const satisfies readonly (keyof ToolOverrides)[];

export function sanitizeToolOverrides(overrides: ToolOverrides = {}): ToolOverrides {
  const source = overrides as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const key of TOOL_OVERRIDE_KEYS) {
    if (Object.hasOwn(source, key)) {
      sanitized[key] = source[key];
    }
  }

  return sanitized as ToolOverrides;
}
