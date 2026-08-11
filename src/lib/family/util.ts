import type { Family, TreeData } from "./types";

export function parentsOf(fam: Pick<Family, "husbandId" | "wifeId">): string[] {
  return [fam.husbandId, fam.wifeId].filter((id) => id !== undefined);
}

export interface Relations {
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  partners: Map<string, string[]>;
}

export function relationsOf(data: TreeData): Relations {
  const { people, families } = data;
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const partners = new Map<string, string[]>();
  for (const p of Object.values(people)) {
    parents.set(p.id, []);
    children.set(p.id, []);
    partners.set(p.id, []);
  }
  for (const fam of Object.values(families)) {
    const parentIds = parentsOf(fam);
    for (const childId of fam.childrenIds) {
      if (!people[childId]) continue;
      for (const pid of parentIds) {
        parents.get(childId)?.push(pid);
        children.get(pid)?.push(childId);
      }
    }
    if (parentIds.length === 2) {
      partners.get(parentIds[0])?.push(parentIds[1]);
      partners.get(parentIds[1])?.push(parentIds[0]);
    }
  }
  return { parents, children, partners };
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
