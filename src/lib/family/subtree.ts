import type { Family, Person, TreeData } from "./types";
import { closure, parentsOf } from "./util";

export type DisplayMode = "all" | "direct" | "directAndChildren";

export interface SubtreeOptions {
  maxDepth?: number;
  mode?: DisplayMode;
}

const DEFAULT_MAX_DEPTH = 10;

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
  const siblings = new Map<string, string[]>();

  for (const p of Object.values(people)) {
    parents.set(p.id, []);
    children.set(p.id, []);
    partners.set(p.id, []);
    siblings.set(p.id, []);
  }

  for (const fam of Object.values(families)) {
    const parentIds = parentsOf(fam);
    const kids = fam.childrenIds.filter((id) => people[id] !== undefined);
    for (const childId of kids) {
      for (const pid of parentIds) {
        parents.get(childId)?.push(pid);
        children.get(pid)?.push(childId);
      }
    }
    if (parentIds.length === 2) {
      partners.get(parentIds[0])?.push(parentIds[1]);
      partners.get(parentIds[1])?.push(parentIds[0]);
    }
    if (parentIds.length === 0) {
      for (const childId of kids) {
        siblings.get(childId)?.push(...kids.filter((id) => id !== childId));
      }
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
    for (const sid of siblings.get(id) ?? []) {
      if (generation.has(sid)) continue;
      generation.set(sid, g);
      queue.push(sid);
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
    const siblingQueue = [...included];
    while (siblingQueue.length > 0) {
      const id = siblingQueue.pop();
      if (id === undefined) continue;
      for (const sid of siblings.get(id) ?? []) {
        if (included.has(sid)) continue;
        const sg = generation.get(sid);
        if (sg !== undefined && (sg > maxDepth || sg < -maxDepth)) continue;
        included.add(sid);
        siblingQueue.push(sid);
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

    const ancestorsOf = closure(parents.get(focalId) ?? [], parents);
    const descendantsOf = closure([focalId], children);

    const siblingsSet = new Set<string>();
    for (const pid of parents.get(focalId) ?? []) {
      for (const cid of children.get(pid) ?? []) {
        if (cid === focalId || included.has(cid)) continue;
        if ((generation.get(cid) ?? Infinity) > maxDepth) continue;
        siblingsSet.add(cid);
        included.add(cid);
      }
    }
    for (const sid of siblings.get(focalId) ?? []) {
      if (included.has(sid)) continue;
      if ((generation.get(sid) ?? Infinity) > maxDepth) continue;
      siblingsSet.add(sid);
      included.add(sid);
    }

    if (mode === "directAndChildren") {
      const seed = new Set<string>([...ancestorsOf, ...siblingsSet]);
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

  const outFamilies: Record<string, Family> = {};
  for (const fam of Object.values(families)) {
    const parentIds = parentsOf(fam);
    if (!parentIds.every((id) => included.has(id))) continue;

    outFamilies[fam.id] = fam;
  }

  return { people: outPeople, families: outFamilies };
}
