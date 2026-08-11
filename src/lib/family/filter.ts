import type { Family, Person, TreeData } from "./types";

interface Relations {
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  partners: Map<string, string[]>;
}

function relationsOf(data: TreeData): Relations {
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
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id) => id !== undefined,
    );
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

function descendantCone(data: TreeData, focalId: string): Set<string> {
  const { children, partners } = relationsOf(data);
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
    for (const sid of partners.get(id) ?? []) result.add(sid);
  }
  return result;
}

function upClosure(ids: string[], parents: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const queue = [...ids];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined || result.has(id)) continue;
    result.add(id);
    queue.push(...(parents.get(id) ?? []));
  }
  return result;
}

function downClosure(
  ids: string[],
  children: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>();
  const queue = [...ids];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined || result.has(id)) continue;
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}

export interface BranchActions {
  canCollapseParents: boolean;
  canCollapseChildren: boolean;
  parentsHiddenByDefault: boolean;
}

export function branchActions(
  data: TreeData,
  focalId: string,
): Map<string, BranchActions> {
  const { parents, children, partners } = relationsOf(data);
  const upCone = upClosure(parents.get(focalId) ?? [], parents);
  const povPartners = new Set(partners.get(focalId) ?? []);
  const result = new Map<string, BranchActions>();
  for (const id of Object.keys(data.people)) {
    result.set(id, {
      canCollapseParents:
        (parents.get(id)?.length ?? 0) > 0 &&
        (id === focalId || upCone.has(id) || povPartners.has(id)),
      canCollapseChildren:
        (children.get(id)?.length ?? 0) > 0 && !upCone.has(id),
      parentsHiddenByDefault: povPartners.has(id),
    });
  }
  return result;
}

export interface FilterCollapsedOptions {
  focalId?: string | null;
  expandedParents?: Set<string>;
}

export function filterCollapsed(
  data: TreeData,
  fullData: TreeData,
  collapsedChildren: Set<string>,
  collapsedParents: Set<string>,
  options: FilterCollapsedOptions = {},
): TreeData {
  const expandedParents = options.expandedParents ?? new Set<string>();
  if (
    collapsedChildren.size === 0 &&
    collapsedParents.size === 0 &&
    expandedParents.size === 0
  ) {
    return data;
  }

  const { people, families } = fullData;
  const { parents, children, partners } = relationsOf(fullData);

  const focalId = options.focalId ?? null;
  const focalAncestors =
    focalId && people[focalId]
      ? upClosure(parents.get(focalId) ?? [], parents)
      : new Set<string>();
  const protectedSpine = new Set<string>();
  if (focalId && people[focalId]) {
    protectedSpine.add(focalId);
    for (const id of descendantCone(fullData, focalId)) protectedSpine.add(id);
  }

  const kept = new Set(Object.keys(data.people));
  const pruned = new Set<string>();

  function pruneDescendants(id: string) {
    for (const cid of children.get(id) ?? []) {
      if (cid === focalId || (focalId && partners.get(focalId)?.includes(cid))) {
        continue;
      }
      if (pruned.has(cid)) continue;
      pruned.add(cid);
      pruneDescendants(cid);
    }
  }

  function pruneParents(id: string) {
    const ancestors = upClosure(parents.get(id) ?? [], parents);
    const keep = downClosure([id], children);
    const collateral = downClosure([...ancestors], children);
    const protectedCollateral = new Set<string>();
    for (const pid of focalAncestors) {
      if (!ancestors.has(pid)) protectedCollateral.add(pid);
    }
    for (const pid of collateral) {
      if (keep.has(pid)) continue;
      if (protectedSpine.has(pid)) continue;
      if (protectedCollateral.has(pid)) continue;
      if (pruned.has(pid)) continue;
      pruned.add(pid);
    }
  }

  function parentsBranch(id: string): Set<string> {
    const ancestors = upClosure(parents.get(id) ?? [], parents);
    const result = new Set<string>();
    for (const anc of ancestors) {
      result.add(anc);
      for (const desc of downClosure([anc], children)) result.add(desc);
    }
    for (const member of [...result]) {
      for (const sid of partners.get(member) ?? []) result.add(sid);
    }
    return result;
  }

  for (const id of expandedParents) {
    if (!people[id]) continue;
    for (const pid of parentsBranch(id)) kept.add(pid);
  }

  for (const id of collapsedChildren) pruneDescendants(id);
  for (const id of collapsedParents) pruneParents(id);

  for (const id of pruned) kept.delete(id);
  if (focalId && people[focalId]) kept.add(focalId);

  if (pruned.size === 0 && expandedParents.size === 0) return data;

  const outFamilies: Record<string, Family> = {};
  for (const fam of Object.values(families)) {
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id) => id !== undefined,
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

  return { people: outPeople, families: outFamilies };
}
