export type ToolArgRule =
  | { type: "numeric_max"; field: string; max: number; message?: string }
  | { type: "numeric_min"; field: string; min: number; message?: string }
  | { type: "field_in_list"; field: string; allowed: string[]; message?: string }
  | { type: "field_not_in_list"; field: string; denied: string[]; message?: string };

export type ToolArgPolicy = {
  rules: ToolArgRule[];
};

export const DEFAULT_TOOL_ARG_POLICY: ToolArgPolicy = { rules: [] };

export function normalizeToolArgPolicy(raw: unknown): ToolArgPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TOOL_ARG_POLICY };
  const rulesRaw = (raw as { rules?: unknown }).rules;
  if (!Array.isArray(rulesRaw)) return { ...DEFAULT_TOOL_ARG_POLICY };
  const rules: ToolArgRule[] = [];
  for (const r of rulesRaw.slice(0, 32)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const type = o.type;
    const field = typeof o.field === "string" ? o.field.slice(0, 64) : "";
    if (!field) continue;
    const message = typeof o.message === "string" ? o.message.slice(0, 200) : undefined;
    if (type === "numeric_max" && typeof o.max === "number") {
      rules.push({ type: "numeric_max", field, max: o.max, message });
    } else if (type === "numeric_min" && typeof o.min === "number") {
      rules.push({ type: "numeric_min", field, min: o.min, message });
    } else if (type === "field_in_list" && Array.isArray(o.allowed)) {
      rules.push({
        type: "field_in_list",
        field,
        allowed: o.allowed.filter((x): x is string => typeof x === "string").slice(0, 32),
        message,
      });
    } else if (type === "field_not_in_list" && Array.isArray(o.denied)) {
      rules.push({
        type: "field_not_in_list",
        field,
        denied: o.denied.filter((x): x is string => typeof x === "string").slice(0, 32),
        message,
      });
    }
  }
  return { rules };
}

function getField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function evaluateToolArgPolicy(
  policy: ToolArgPolicy,
  toolName: string,
  args: Record<string, unknown>
): { block: boolean; ruleId?: string; message?: string } {
  void toolName;
  for (let i = 0; i < policy.rules.length; i++) {
    const rule = policy.rules[i]!;
    const val = getField(args, rule.field);
    if (rule.type === "numeric_max") {
      const n = Number(val);
      if (Number.isFinite(n) && n > rule.max) {
        return { block: true, ruleId: `arg_rule_${i}`, message: rule.message ?? `Max ${rule.max}` };
      }
    }
    if (rule.type === "numeric_min") {
      const n = Number(val);
      if (Number.isFinite(n) && n < rule.min) {
        return { block: true, ruleId: `arg_rule_${i}`, message: rule.message ?? `Min ${rule.min}` };
      }
    }
    if (rule.type === "field_in_list" && val !== undefined) {
      const s = String(val);
      if (!rule.allowed.includes(s)) {
        return { block: true, ruleId: `arg_rule_${i}`, message: rule.message ?? "Not in allowed list" };
      }
    }
    if (rule.type === "field_not_in_list" && val !== undefined) {
      const s = String(val);
      if (rule.denied.includes(s)) {
        return { block: true, ruleId: `arg_rule_${i}`, message: rule.message ?? "Denied value" };
      }
    }
  }
  return { block: false };
}
