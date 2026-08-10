import type { Family, Person, TreeData } from "./types";

export function filterCollapsed(
  data: TreeData,
  collapsedChildren: Set<string>,
  collapsedParents: Set<string>,
): TreeData {
  if (collapsedChildren.size === 0 && collapsedParents.size === 0) {
    return data;
  }

  const { people, families } = data;

  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const p of Object.values(people)) {
    parents.set(p.id, []);
    children.set(p.id, []);
  }
  for (const fam of Object.values(families)) {
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined,
    );
    for (const childId of fam.childrenIds) {
      if (!people[childId]) continue;
      for (const pid of parentIds) {
        parents.get(childId)?.push(pid);
        children.get(pid)?.push(childId);
      }
    }
  }

  const pruned = new Set<string>();

  function pruneDescendants(id: string) {
    for (const cid of children.get(id) ?? []) {
      if (pruned.has(cid)) continue;
      pruned.add(cid);
      pruneDescendants(cid);
    }
  }

  function pruneAncestors(id: string) {
    for (const pid of parents.get(id) ?? []) {
      if (pruned.has(pid)) continue;
      pruned.add(pid);
      pruneAncestors(pid);
    }
  }

  for (const id of collapsedChildren) pruneDescendants(id);
  for (const id of collapsedParents) pruneAncestors(id);

  if (pruned.size === 0) return data;

  const kept = new Set(Object.keys(people).filter((id) => !pruned.has(id)));

  const outFamilies: Record<string, Family> = {};
  for (const fam of Object.values(families)) {
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined,
    );
    const keptParents = parentIds.filter((id) => kept.has(id));
    const keptChildren = fam.childrenIds.filter((id) => kept.has(id));
    if (keptParents.length !== parentIds.length) continue;
    if (keptParents.length === 0 && keptChildren.length === 0) continue;
    outFamilies[fam.id] = fam;
  }

  const connected = new Set<string>();
  for (const fam of Object.values(outFamilies)) {
    for (const id of [fam.husbandId, fam.wifeId]) {
      if (id !== undefined && kept.has(id)) connected.add(id);
    }
    for (const id of fam.childrenIds) {
      if (kept.has(id)) connected.add(id);
    }
  }

  const outPeople: Record<string, Person> = {};
  for (const id of kept) {
    if (
      connected.has(id) ||
      collapsedChildren.has(id) ||
      collapsedParents.has(id)
    ) {
      outPeople[id] = people[id];
    }
  }

  return {
    people: outPeople,
    families: outFamilies,
    sourceId: data.sourceId,
  };
}
