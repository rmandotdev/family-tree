import type { Family } from "./types";

export function parentsOf(fam: Pick<Family, "husbandId" | "wifeId">): string[] {
  return [fam.husbandId, fam.wifeId].filter((id) => id !== undefined);
}

export function closure(
  ids: string[],
  map: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>();
  const queue = [...ids];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined || result.has(id)) continue;
    result.add(id);
    queue.push(...(map.get(id) ?? []));
  }
  return result;
}
