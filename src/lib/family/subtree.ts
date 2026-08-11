import type { Family, Person, TreeData } from "./types";

export type DisplayMode = "all" | "direct" | "directAndChildren";

export interface SubtreeOptions {
  maxDepth?: number;
  mode?: DisplayMode;
}

const DEFAULT_MAX_DEPTH = 10;

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

function sortChildrenForPOV(
  childrenIds: string[],
  directAncestors: Set<string>,
  people: Record<string, Person>,
): string[] {
  return [...childrenIds].sort((aId, bId) => {
    const aIsAncestor = directAncestors.has(aId);
    const bIsAncestor = directAncestors.has(bId);

    const aPerson = people[aId];
    const bPerson = people[bId];

    const getPriority = (isAncestor: boolean, person?: Person) => {
      if (!isAncestor) return 1;
      return person?.gender === "female" ? 0 : 2;
    };

    return (
      getPriority(aIsAncestor, aPerson) - getPriority(bIsAncestor, bPerson)
    );
  });
}

export function computeSubtree(
  data: TreeData,
  focalId: string,
  options: SubtreeOptions = {},
): TreeData {
  const { people, families } = data;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const mode = options.mode ?? "all";

  if (!people[focalId]) return { people: {}, families: {} };

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

  const generation = new Map<string, number>();
  generation.set(focalId, 0);
  const queue = [focalId];
  let head = 0;
  while (head < queue.length) {
    const id = queue[head];
    head += 1;
    const g = generation.get(id);
    if (g === undefined) continue;
    for (const pid of parents.get(id) ?? []) {
      if (generation.has(pid)) continue;
      generation.set(pid, g - 1);
      queue.push(pid);
    }
    for (const cid of children.get(id) ?? []) {
      if (generation.has(cid)) continue;
      generation.set(cid, g + 1);
      queue.push(cid);
    }
  }

  const included = new Set<string>();
  included.add(focalId);

  const ancestors = [focalId];
  while (ancestors.length > 0) {
    const id = ancestors.pop();
    if (id === undefined) continue;
    for (const pid of parents.get(id) ?? []) {
      if (included.has(pid)) continue;
      if ((generation.get(pid) ?? -Infinity) < -maxDepth) continue;
      included.add(pid);
      ancestors.push(pid);
    }
  }

  if (mode === "all") {
    const descendants = [...included];
    while (descendants.length > 0) {
      const id = descendants.pop();
      if (id === undefined) continue;
      for (const cid of children.get(id) ?? []) {
        if (included.has(cid)) continue;
        if ((generation.get(cid) ?? Infinity) > maxDepth) continue;
        included.add(cid);
        descendants.push(cid);
      }
    }
    for (const id of [...included]) {
      for (const sid of partners.get(id) ?? []) included.add(sid);
    }
  } else {
    const descendants = [focalId];
    while (descendants.length > 0) {
      const id = descendants.pop();
      if (id === undefined) continue;
      for (const cid of children.get(id) ?? []) {
        if (included.has(cid)) continue;
        if ((generation.get(cid) ?? Infinity) > maxDepth) continue;
        included.add(cid);
        descendants.push(cid);
      }
    }

    const ancestorsOf = upClosure(parents.get(focalId) ?? [], parents);
    const descendantsOf = downClosure([focalId], children);

    const siblings = new Set<string>();
    for (const pid of parents.get(focalId) ?? []) {
      for (const cid of children.get(pid) ?? []) {
        if (cid === focalId || included.has(cid)) continue;
        if ((generation.get(cid) ?? Infinity) > maxDepth) continue;
        siblings.add(cid);
        included.add(cid);
      }
    }

    if (mode === "directAndChildren") {
      const seed = new Set<string>([...ancestorsOf, ...siblings]);
      for (const s of seed) {
        for (const cid of children.get(s) ?? []) {
          if (included.has(cid)) continue;
          if ((generation.get(cid) ?? Infinity) > maxDepth) continue;
          included.add(cid);
        }
      }
    }

    const directLine = new Set<string>([
      focalId,
      ...ancestorsOf,
      ...descendantsOf,
    ]);
    for (const id of directLine) {
      for (const sid of partners.get(id) ?? []) included.add(sid);
    }
  }

  const outPeople: Record<string, Person> = {};
  for (const id of included) {
    const p = people[id];
    if (p) outPeople[id] = p;
  }

  const directAncestors = upClosure(parents.get(focalId) ?? [], parents);
  directAncestors.add(focalId);

  const outFamilies: Record<string, Family> = {};
  for (const fam of Object.values(families)) {
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id) => id !== undefined,
    );
    if (!parentIds.every((id) => included.has(id))) continue;

    outFamilies[fam.id] = {
      ...fam,
      childrenIds: sortChildrenForPOV(fam.childrenIds, directAncestors, people),
    };
  }

  return { people: outPeople, families: outFamilies };
}
