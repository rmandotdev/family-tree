import type { Family, Person, TreeData } from "./types";

interface Relations {
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  spouses: Map<string, string[]>;
}

function relationsOf(data: TreeData): Relations {
  const { people, families } = data;
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();
  for (const p of Object.values(people)) {
    parents.set(p.id, []);
    children.set(p.id, []);
    spouses.set(p.id, []);
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
    if (parentIds.length === 2) {
      spouses.get(parentIds[0])?.push(parentIds[1]);
      spouses.get(parentIds[1])?.push(parentIds[0]);
    }
  }
  return { parents, children, spouses };
}

function descendantCone(data: TreeData, focalId: string): Set<string> {
  const { children, spouses } = relationsOf(data);
  const result = new Set<string>();
  const queue = [focalId];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined) continue;
    for (const cid of children.get(id) ?? []) {
      if (result.has(cid)) continue;
      result.add(cid);
      queue.push(cid);
    }
  }
  for (const id of [...result]) {
    for (const sid of spouses.get(id) ?? []) result.add(sid);
  }
  return result;
}

export interface BranchActions {
  canCollapseParents: boolean;
  canCollapseChildren: boolean;
}

export function branchActions(
  data: TreeData,
  focalId: string,
): Map<string, BranchActions> {
  const { parents, children } = relationsOf(data);
  const cone = descendantCone(data, focalId);
  const result = new Map<string, BranchActions>();
  for (const id of Object.keys(data.people)) {
    result.set(id, {
      canCollapseParents: (parents.get(id)?.length ?? 0) > 0 && !cone.has(id),
      canCollapseChildren: (children.get(id)?.length ?? 0) > 0,
    });
  }
  return result;
}

export interface FilterCollapsedOptions {
  focalId?: string | null;
}

export function filterCollapsed(
  data: TreeData,
  collapsedChildren: Set<string>,
  collapsedParents: Set<string>,
  options: FilterCollapsedOptions = {},
): TreeData {
  if (collapsedChildren.size === 0 && collapsedParents.size === 0) {
    return data;
  }

  const { people, families } = data;
  const { parents, children } = relationsOf(data);

  const focalId = options.focalId ?? null;
  const protectedAncestors = new Set<string>();
  if (focalId && people[focalId]) {
    protectedAncestors.add(focalId);
    for (const id of descendantCone(data, focalId)) protectedAncestors.add(id);
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
      if (protectedAncestors.has(pid)) continue;
      if (pruned.has(pid)) continue;
      pruned.add(pid);
      pruneAncestors(pid);
    }
  }

  for (const id of collapsedChildren) pruneDescendants(id);
  for (const id of collapsedParents) pruneAncestors(id);

  if (pruned.size === 0) return data;

  const kept = new Set(Object.keys(people).filter((id) => !pruned.has(id)));
  if (focalId && people[focalId]) kept.add(focalId);

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
      collapsedParents.has(id) ||
      id === focalId
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
