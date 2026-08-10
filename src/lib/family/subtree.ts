import type { Family, Person, TreeData } from "./types";

export interface SubtreeOptions {
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 10;

export function computeSubtree(
  data: TreeData,
  focalId: string,
  options: SubtreeOptions = {},
): TreeData {
  const { people, families } = data;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (!people[focalId]) return { people: {}, families: {}, sourceId: null };

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
    for (const sid of spouses.get(id) ?? []) included.add(sid);
  }

  const outPeople: Record<string, Person> = {};
  for (const id of included) {
    const p = people[id];
    if (p) outPeople[id] = p;
  }

  const outFamilies: Record<string, Family> = {};
  for (const fam of Object.values(families)) {
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined,
    );
    if (!parentIds.every((id) => included.has(id))) continue;
    outFamilies[fam.id] = fam;
  }

  return { people: outPeople, families: outFamilies, sourceId: data.sourceId };
}
