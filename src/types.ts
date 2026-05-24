import type { Tool } from "ai";

export type ToolOverrides = Partial<
  Pick<
    Tool,
    | "description"
    | "needsApproval"
    | "onInputAvailable"
    | "onInputDelta"
    | "onInputStart"
    | "providerOptions"
    | "strict"
    | "title"
    | "toModelOutput"
  >
>;
