import type { ContentPart, JsonValue } from "@agentdock-ai/contracts";
import type { RenderMessageItem } from "./render-model.js";
import { normalizeContent } from "./normalize-content.js";

/** Match LangGraph's tool-role transcript message to its structured tool result. */
export function matchesToolOutput(
  message: RenderMessageItem,
  output: JsonValue | undefined,
): boolean {
  if (output === undefined) return false;
  const content = messageContent(message);
  if (typeof output === "string")
    return (
      content.length === 1 &&
      content[0]?.type === "text" &&
      content[0].text === output
    );

  if (output !== null && !Array.isArray(output) && typeof output === "object")
    return (
      content.length === 1 &&
      content[0]?.type === "custom" &&
      content[0].name === "model-content" &&
      JSON.stringify(content[0].data) === JSON.stringify(output)
    );

  if (Array.isArray(output)) {
    const expected = normalizeContent(
      output.flatMap((part): ContentPart[] => {
        if (
          part !== null &&
          typeof part === "object" &&
          !Array.isArray(part) &&
          part.type === "text" &&
          typeof part.text === "string"
        )
          return [{ type: "text", text: part.text }];
        return [{ type: "custom", name: "model-content", data: part }];
      }),
    );
    return JSON.stringify(content) === JSON.stringify(expected);
  }

  return false;
}

/** Keep legacy tool messages visible inside a tool card when no call record exists. */
export function toolMessageOutput(message: RenderMessageItem): JsonValue {
  const content = messageContent(message);
  if (content.length === 1 && content[0]?.type === "text")
    return content[0].text;
  if (
    content.length === 1 &&
    content[0]?.type === "custom" &&
    content[0].name === "model-content"
  )
    return content[0].data;
  return content as JsonValue;
}

function messageContent(message: RenderMessageItem): ContentPart[] {
  return normalizeContent(
    message.blocks.map(
      ({ id, position, state, startedAt, completedAt, ...part }) => part,
    ),
  );
}
