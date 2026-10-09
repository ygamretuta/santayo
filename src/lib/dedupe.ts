import { haversineKm } from "./geo";
import type { Restaurant } from "./types";

function tokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\(.*?\)/g, " ")
    .split(/\s[-–—@|:]\s/)[0]
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Same chain/place: equal names, or one is the other plus a location suffix. */
function sameName(a: string[], b: string[]): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length === 0 || !short.every((t, i) => long[i] === t)) return false;
  return short.length >= 2 || short[0].length >= 7 || long.length === short.length;
}

/**
 * Removes repeat listings of the same place and collapses chains to their
 * nearest branch (noting how many others were hidden). Order is preserved.
 */
export function dedupeRestaurants(list: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const unique = list.filter((r) => !seen.has(r.id) && seen.add(r.id));
  const toks = unique.map((r) => tokens(r.name));

  // Union-find over name matches.
  const parent = unique.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < unique.length; i++)
    for (let j = i + 1; j < unique.length; j++)
      if (sameName(toks[i], toks[j])) parent[find(j)] = find(i);

  const groups = new Map<number, Restaurant[]>();
  unique.forEach((r, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), r]);
  });

  const keep = new Map<string, Restaurant>();
  for (const members of groups.values()) {
    const best = members.reduce((a, b) =>
      (b.distanceKm ?? Infinity) < (a.distanceKm ?? Infinity) ? b : a,
    );
    // Same-spot listings (e.g. a restaurant listed twice) aren't "other branches".
    const branches = members.filter(
      (m) =>
        m !== best &&
        !(
          m.lat != null && m.lng != null && best.lat != null && best.lng != null &&
          haversineKm({ lat: m.lat, lng: m.lng }, { lat: best.lat, lng: best.lng }) < 0.1
        ),
    ).length;
    keep.set(best.id, branches ? { ...best, otherBranches: branches } : best);
  }
  return unique.filter((r) => keep.has(r.id)).map((r) => keep.get(r.id)!);
}
