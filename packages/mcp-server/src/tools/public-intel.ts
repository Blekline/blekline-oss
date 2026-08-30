import { THREAT_CATALOG_URL, ARENA_LATEST_URL } from "./registry.js";

const cache = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 5 * 60 * 1000;

async function fetchJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}

type ThreatIncident = Record<string, unknown> & {
  applies_if?: { stack_tags?: string[] };
  asi_tags?: string[];
};

export async function handleThreatSearch(args: Record<string, unknown>) {
  const catalog = (await fetchJson(THREAT_CATALOG_URL)) as { incidents?: ThreatIncident[] };
  let items = (catalog.incidents ?? []).filter((i) => i.status === "published");

  const q = args.query ? String(args.query).toLowerCase() : "";
  const stackTag = args.stackTag ? String(args.stackTag) : "";
  const tier = args.tier ? String(args.tier) : "";
  const asiTag = args.asiTag ? String(args.asiTag) : "";
  const limit = typeof args.limit === "number" ? args.limit : 5;

  if (q) {
    items = items.filter(
      (i) =>
        String(i.title).toLowerCase().includes(q) ||
        String(i.summary).toLowerCase().includes(q),
    );
  }
  if (stackTag) {
    items = items.filter((i) => (i.applies_if?.stack_tags ?? []).includes(stackTag));
  }
  if (tier) items = items.filter((i) => i.tier === tier);
  if (asiTag) items = items.filter((i) => (i.asi_tags ?? []).includes(asiTag));

  return items.slice(0, limit).map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    tier: i.tier,
    summary: i.summary,
    source_url: i.source_url,
    url: `https://blekline.com/threats/${i.slug}`,
  }));
}

type ArenaRow = Record<string, unknown> & {
  scores?: Record<string, number>;
};

export async function handleArenaLookup(args: Record<string, unknown>) {
  const arena = (await fetchJson(ARENA_LATEST_URL)) as { results?: ArenaRow[] };
  let rows = arena.results ?? [];
  if (args.agent) rows = rows.filter((r) => r.agent === String(args.agent));
  if (args.model) rows = rows.filter((r) => r.model === String(args.model));

  const category = args.category ? String(args.category) : null;
  return rows.slice(0, 10).map((r) => ({
    rank: r.rank,
    label: r.label,
    agent: r.agent,
    model: r.model,
    overall: r.overall,
    categoryScore: category ? r.scores?.[category] : undefined,
    scores: r.scores,
    avgTimeMin: r.avgTimeMin,
  }));
}
