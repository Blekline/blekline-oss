import type { BleklineClient } from "@blekline/client";
import type { EnforceToolCallResult, MaskResponse } from "@blekline/contracts";

export type BleklineToolDecision = EnforceToolCallResult & {
  proceed: boolean;
};

export async function maskPromptForChain(
  client: BleklineClient,
  text: string,
  platform = "langchain"
): Promise<MaskResponse> {
  return client.mask({ text, platform });
}

export async function enforceToolCallForChain(
  client: BleklineClient,
  toolName: string,
  args: Record<string, unknown>,
  platform = "langchain"
): Promise<BleklineToolDecision> {
  const result = await client.enforceToolCall({
    toolName,
    arguments: args,
    platform,
    clientSurface: "sdk",
  });
  return {
    ...result,
    proceed: result.action !== "block",
  };
}

/** Wrap a tool handler: enforce policy, then run with masked arguments when action is mask. */
export function withBleklineToolGuard<T extends Record<string, unknown>, R>(
  client: BleklineClient,
  toolName: string,
  handler: (args: T) => Promise<R> | R,
  platform = "langchain"
): (args: T) => Promise<R> {
  return async (args: T) => {
    const decision = await enforceToolCallForChain(client, toolName, args, platform);
    if (decision.action === "block") {
      throw new Error(`Blekline blocked tool call: ${toolName}`);
    }
    const finalArgs =
      decision.action === "mask" && decision.maskedArguments
        ? (decision.maskedArguments as T)
        : args;
    return handler(finalArgs);
  };
}