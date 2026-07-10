import type { Tool } from "ai";

export type ToolOverrides = Partial<
  Pick<
    Tool,
    | "description"
    | "onInputAvailable"
    | "onInputDelta"
    | "onInputStart"
    | "providerOptions"
    | "strict"
    | "title"
    | "toModelOutput"
  >
>;
