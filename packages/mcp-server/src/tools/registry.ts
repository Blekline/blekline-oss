/** Canonical Blekline MCP tool names (Claude connector review). */
export const BLEKLINE_MCP_TOOLS = {
  maskPrompt: "blekline_mask_prompt",
  simulatePolicy: "blekline_simulate_policy",
  logGovernanceEvent: "blekline_log_governance_event",
  evaluateToolCall: "blekline_evaluate_tool_call",
  threatSearch: "blekline_threat_search",
  arenaLookup: "blekline_arena_lookup",
} as const;

const MARKETING_ORIGIN =
  process.env.BLEKLINE_MARKETING_JSON_ORIGIN?.trim() || "https://app.blekline.com";
export const THREAT_CATALOG_URL = `${MARKETING_ORIGIN}/marketing/threats/catalog.json`;
export const ARENA_LATEST_URL = `${MARKETING_ORIGIN}/marketing/arena/latest.json`;

/** Deprecated aliases — kept for Cursor/Codex configs until 0.5.0. */
export const BLEKLINE_MCP_TOOL_ALIASES: Record<string, string> = {
  blekline_classify_risk: BLEKLINE_MCP_TOOLS.simulatePolicy,
  blekline_emit_event: BLEKLINE_MCP_TOOLS.logGovernanceEvent,
};

export function resolveToolName(name: string): string {
  return BLEKLINE_MCP_TOOL_ALIASES[name] ?? name;
}

export type McpToolAnnotation = {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
};

export type BleklineMcpToolDef = {
  name: string;
  title: string;
  description: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  inputSchema: Record<string, unknown>;
};

const TOOL_DEFS: BleklineMcpToolDef[] = [
  {
    name: BLEKLINE_MCP_TOOLS.maskPrompt,
    title: "Mask prompt",
    description:
      "Mask PII and secrets in prompt text via the Blekline control plane before sending content to an LLM.",
    readOnlyHint: false,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Prompt text to mask" },
        platform: { type: "string", description: "Optional platform label (e.g. Claude Desktop)" },
      },
      required: ["text"],
    },
  },
  {
    name: BLEKLINE_MCP_TOOLS.simulatePolicy,
    title: "Simulate policy",
    description:
      "Read-only simulation of Blekline redaction policy on a prompt without applying masking or persisting content.",
    readOnlyHint: true,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        platform: { type: "string" },
        sourceHost: { type: "string" },
      },
      required: ["prompt"],
    },
  },
  {
    name: BLEKLINE_MCP_TOOLS.logGovernanceEvent,
    title: "Log governance event",
    description:
      "Write a metadata-only governance audit event to the Blekline workspace. Does not store raw prompt content.",
    readOnlyHint: false,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string" },
        platform: { type: "string" },
        entitiesMasked: { type: "number" },
        riskTier: { type: "string", enum: ["low", "medium", "high"] },
        action: { type: "string" },
      },
      required: ["kind"],
    },
  },
  {
    name: BLEKLINE_MCP_TOOLS.evaluateToolCall,
    title: "Evaluate tool call",
    description:
      "Read-only evaluation of MCP tool name and arguments against Blekline workspace tool policy (allow, mask, or block).",
    readOnlyHint: true,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        toolName: { type: "string" },
        arguments: { type: "object" },
        platform: { type: "string" },
      },
      required: ["toolName", "arguments"],
    },
  },
  {
    name: BLEKLINE_MCP_TOOLS.threatSearch,
    title: "Search agent threat catalog",
    description:
      "Read-only search of the public Agent Threat Landscape (blekline.com/threats). Filter by stack tag, tier, or ASI tag.",
    readOnlyHint: true,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search in title/summary" },
        stackTag: { type: "string", description: "e.g. kubernetes, mcp, cursor" },
        tier: { type: "string", enum: ["S", "A", "B", "C"] },
        asiTag: { type: "string", description: "e.g. ASI02" },
        limit: { type: "number", description: "Max results (default 5)" },
      },
    },
  },
  {
    name: BLEKLINE_MCP_TOOLS.arenaLookup,
    title: "Lookup Agent Security Arena scores",
    description:
      "Read-only lookup of agent×model scores from the public Agent Security Arena leaderboard (blekline.com/cyber-model-arena).",
    readOnlyHint: true,
    destructiveHint: false,
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "e.g. cursor, claude_code" },
        model: { type: "string", description: "e.g. gpt-5-2, kimi-k2" },
        category: {
          type: "string",
          enum: ["agent_boundary", "code_vulns", "api_security", "web_security", "cloud_k8s"],
        },
      },
    },
  },
];

export function listBleklineMcpTools(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: McpToolAnnotation;
}> {
  return TOOL_DEFS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: {
      title: t.title,
      readOnlyHint: t.readOnlyHint,
      destructiveHint: t.destructiveHint,
    },
  }));
}

/** Include deprecated alias entries in tools/list for backward compatibility. */
export function listBleklineMcpToolsWithAliases(): ReturnType<typeof listBleklineMcpTools> {
  const canonical = listBleklineMcpTools();
  const aliasTools = Object.entries(BLEKLINE_MCP_TOOL_ALIASES).map(([alias, canonicalName]) => {
    const base = TOOL_DEFS.find((t) => t.name === canonicalName)!;
    return {
      name: alias,
      description: `[Deprecated — use ${canonicalName}] ${base.description}`,
      inputSchema: base.inputSchema,
      annotations: {
        title: base.title,
        readOnlyHint: base.readOnlyHint,
        destructiveHint: base.destructiveHint,
      },
    };
  });
  return [...canonical, ...aliasTools];
}

export function allKnownToolNames(): string[] {
  return [
    ...TOOL_DEFS.map((t) => t.name),
    ...Object.keys(BLEKLINE_MCP_TOOL_ALIASES),
  ];
}
