import type { Family, Person, TreeData } from "./types";
import { closure, parentsOf, relationsOf } from "./util";

export const CARD_W = 160;
export const CARD_H = 90;
export const CARD_GAP = 20;
export const ROW_H = 200;
export const BUS_OFFSET = 40;
export const BUS_STEP = 8;
export const MARGIN = 24;

export const COL_W = CARD_W + CARD_GAP;

export interface Point {
  x: number;
  y: number;
}

export interface CardGrid {
  row: number;
  col: number;
}

export interface GroupGrid {
  members: string[];
  children: string[];
  row: number;
  col: number;
}

export interface GridLayout {
  cards: Map<string, CardGrid>;
  groups: GroupGrid[];
  siblingGroups: string[][];
}

export interface LayoutResult {
  positions: Map<string, Point>;
  width: number;
  height: number;
}

interface Group {
  members: string[];
  children: string[];
  col: number;
  row: number;
}

function povPathOf(data: TreeData, pov: string): Set<string> | null {
  if (!data.people[pov]) return null;
  const parents = relationsOf(data).parents;
  const result = new Set<string>();
  const queue = [pov];
  while (queue.length > 0) {
    const id = queue.pop();
    if (id === undefined || result.has(id)) continue;
    result.add(id);
    queue.push(...(parents.get(id) ?? []));
  }
  const ancestors = new Set(result);
  for (const fam of Object.values(data.families)) {
    const parentIds = parentsOf(fam);
    for (const pid of parentIds) {
      if (!ancestors.has(pid)) continue;
      for (const other of parentIds) if (other !== pid) result.add(other);
    }
  }
  return result;
}

function sortChildrenForPOV(
  childrenIds: string[],
  onPath: Set<string>,
  people: Record<string, Person>,
): string[] {
  return [...childrenIds].sort((aId, bId) => {
    const aIsOnPath = onPath.has(aId);
    const bIsOnPath = onPath.has(bId);

    const aPerson = people[aId];
    const bPerson = people[bId];

    const getPriority = (isOnPath: boolean, person?: Person) => {
      if (!isOnPath) return 1;
      return person?.gender === "female" ? 0 : 2;
    };

    return getPriority(aIsOnPath, aPerson) - getPriority(bIsOnPath, bPerson);
  });
}

export function computeGrid(data: TreeData, pov?: string): GridLayout {
  const people = data.people;
  const families = data.families;
  const list = Object.values(people);
  const byId = new Map(list.map((p) => [p.id, p]));
  const groups: Group[] = [];
  const groupOf = new Map<string, Group>();
  const assigned = new Set<string>();

  const onPath = pov ? povPathOf(data, pov) : null;
  const childrenOf = (fam: Family) => {
    const ids = onPath
      ? sortChildrenForPOV(fam.childrenIds, onPath, people)
      : fam.childrenIds;
    return ids.filter((id) => byId.has(id));
  };

  const relations = relationsOf(data);
  const paternalAncestors = new Set<string>();
  const maternalAncestors = new Set<string>();
  if (pov && people[pov]) {
    const focalParents = relations.parents.get(pov) ?? [];
    const dadId =
      focalParents.find((id) => people[id]?.gender === "male") ??
      focalParents[0] ??
      "";
    const momId =
      focalParents.find((id) => people[id]?.gender === "female") ??
      focalParents[1] ??
      "";
    if (dadId && people[dadId]) {
      for (const a of closure([dadId], relations.parents)) {
        if (a !== dadId) paternalAncestors.add(a);
      }
    }
    if (momId && people[momId]) {
      for (const a of closure([momId], relations.parents)) {
        if (a !== momId) maternalAncestors.add(a);
      }
    }
  }
  function groupSide(group: Group): "left" | "right" | null {
    for (const id of group.members) {
      if (paternalAncestors.has(id)) return "left";
      if (maternalAncestors.has(id)) return "right";
    }
    return null;
  }

  for (const fam of Object.values(families)) {
    const members = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined && byId.has(id),
    );
    if (members.length === 0) continue;
    const unassigned = members.filter((id) => !assigned.has(id));
    if (unassigned.length === 0) continue;
    const group: Group = {
      members: unassigned,
      col: 0,
      row: 0,
      children: childrenOf(fam),
    };
    groups.push(group);
    for (const id of unassigned) {
      groupOf.set(id, group);
      assigned.add(id);
    }
  }

  for (const p of list) {
    if (assigned.has(p.id)) continue;
    const group: Group = {
      members: [p.id],
      col: 0,
      row: 0,
      children: [],
    };
    groups.push(group);
    groupOf.set(p.id, group);
    assigned.add(p.id);
  }

  const sameRowParent = new Map<Group, Group>();
  const find = (g: Group): Group => {
    const p = sameRowParent.get(g);
    if (!p) return g;
    const root = find(p);
    sameRowParent.set(g, root);
    return root;
  };
  const union = (a: Group, b: Group) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) sameRowParent.set(rb, ra);
  };

  const siblingGroups: Group[][] = [];
  for (const fam of Object.values(families)) {
    if (fam.husbandId !== undefined || fam.wifeId !== undefined) continue;
    const members = fam.childrenIds
      .map((id) => groupOf.get(id))
      .filter((g): g is Group => g !== undefined);
    for (let i = 1; i < members.length; i++) union(members[0], members[i]);
    if (members.length >= 2) siblingGroups.push(members);
  }

  const groupMembers = new Map<Group, Group[]>();
  for (const group of groups) {
    const root = find(group);
    const arr = groupMembers.get(root) ?? [];
    arr.push(group);
    groupMembers.set(root, arr);
  }

  const parentGroups = new Map<Group, Group[]>();
  const childGroups = new Map<Group, Group[]>();
  for (const group of groups) {
    parentGroups.set(group, []);
    childGroups.set(group, []);
  }
  for (const group of groups) {
    for (const childId of group.children) {
      const child = groupOf.get(childId);
      if (child && child !== group) {
        parentGroups.get(child)?.push(group);
        childGroups.get(group)?.push(child);
      }
    }
  }

  const rows = new Map<Group, number>(groups.map((g) => [g, 0]));
  for (let i = 0; i <= groups.length; i++) {
    let changed = false;
    for (const group of groups) {
      const r = rows.get(group) ?? 0;
      for (const child of childGroups.get(group) ?? []) {
        if ((rows.get(child) ?? 0) < r + 1) {
          rows.set(child, r + 1);
          changed = true;
        }
      }
      for (const parent of parentGroups.get(group) ?? []) {
        if ((rows.get(parent) ?? 0) < r - 1) {
          rows.set(parent, r - 1);
          changed = true;
        }
      }
    }
    for (const members of groupMembers.values()) {
      if (members.length < 2) continue;
      let max = 0;
      for (const member of members) max = Math.max(max, rows.get(member) ?? 0);
      for (const member of members) {
        if ((rows.get(member) ?? 0) < max) {
          rows.set(member, max);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  for (const group of groups) group.row = rows.get(group) ?? 0;

  const roots = groups.filter((g) => (parentGroups.get(g) ?? []).length === 0);
  const visited = new Set<Group>();
  const occupied = new Map<number, Array<[number, number]>>();
  let cursor = 0;

  function cols(group: Group): number {
    return group.members.length;
  }

  function snapCol(center: number, n: number): number {
    return n === 2 ? Math.round(center) : Math.round(center - 0.5) + 0.5;
  }

  function record(row: number, lo: number, hi: number) {
    let ranges = occupied.get(row);
    if (!ranges) {
      ranges = [];
      occupied.set(row, ranges);
    }
    ranges.push([lo, hi]);
  }

  function freeCenter(
    row: number,
    lo: number,
    hi: number,
    prefer: "left" | "right" | null = null,
  ): number {
    const ranges = [...(occupied.get(row) ?? [])].sort((a, b) => a[0] - b[0]);
    if (!ranges.some(([a, b]) => lo < b && hi > a)) return (lo + hi) / 2;
    const w = hi - lo;
    const gaps: number[] = [];
    let prevEnd = -Infinity;
    for (const [start, end] of ranges) {
      if (start - prevEnd >= w) gaps.push(start - w + w / 2);
      prevEnd = Math.max(prevEnd, end);
    }
    gaps.push(prevEnd + w / 2);
    if (prefer === "left") return gaps[0];
    if (prefer === "right") return gaps[gaps.length - 1];
    const target = (lo + hi) / 2;
    let best = Infinity;
    for (const mid of gaps) {
      if (Math.abs(mid - target) < Math.abs(best - target)) best = mid;
    }
    return best === Infinity ? (lo + hi) / 2 : best;
  }

  function preferDirection(group: Group): "left" | "right" | null {
    let left = 0;
    let right = 0;
    for (const child of childGroups.get(group) ?? []) {
      if (child.members.length !== 2) continue;
      const [husbandId, wifeId] = child.members;
      const coParents = parentGroups.get(child) ?? [];
      const paternal = coParents.some(
        (p) => p !== group && p.children.includes(husbandId),
      );
      const maternal = coParents.some(
        (p) => p !== group && p.children.includes(wifeId),
      );
      if (group.children.includes(husbandId) && maternal) left++;
      if (group.children.includes(wifeId) && paternal) right++;
    }
    if (left > right) return "left";
    if (right > left) return "right";
    return null;
  }

  const parentlessFamilies = Object.values(families).filter(
    (f) => f.husbandId === undefined && f.wifeId === undefined,
  );

  function flankSide(anchor: Group, mid: string): "left" | "right" | null {
    const fam = parentlessFamilies.find(
      (f) =>
        f.childrenIds.includes(mid) &&
        anchor.members.some((m) => f.childrenIds.includes(m)),
    );
    if (!fam) return null;
    const [husbandId, wifeId] = anchor.members;
    if (husbandId !== undefined && fam.childrenIds.includes(husbandId))
      return "left";
    if (wifeId !== undefined && fam.childrenIds.includes(wifeId))
      return "right";
    return null;
  }

  function siblingAnchor(root: Group): Group | null {
    if (root.children.length !== 0) return null;
    const union = groupMembers.get(find(root)) ?? [];
    return (
      union.find(
        (g) => g !== root && g.children.length > 0 && g.members.length === 2,
      ) ?? null
    );
  }

  function layoutGroup(group: Group) {
    if (visited.has(group)) return;
    visited.add(group);
    const n = cols(group);
    if (group.children.length === 0) {
      group.col = cursor + n / 2;
      cursor += n;
      record(group.row, group.col - n / 2, group.col + n / 2);
      return;
    }

    for (const childId of group.children) {
      const child = groupOf.get(childId);
      if (child) layoutGroup(child);
    }

    const first = groupOf.get(group.children[0]);
    const last =
      group.children.length > 1
        ? groupOf.get(group.children[group.children.length - 1])
        : first;
    if (first && last) {
      const dir = preferDirection(group);
      if (n === 1 && first === last && first.members.length === 2) {
        group.col = dir === "right" ? first.col + 0.5 : first.col - 0.5;
      } else {
        group.col = snapCol((first.col + last.col) / 2, n);
      }
      cursor = Math.max(cursor, group.col + n / 2);
    } else {
      group.col = cursor + n / 2;
      cursor += n;
    }

    group.col = freeCenter(
      group.row,
      group.col - n / 2,
      group.col + n / 2,
      preferDirection(group),
    );
    record(group.row, group.col - n / 2, group.col + n / 2);
  }

  const rootFlanks = new Map<
    Group,
    { anchor: Group; side: "left" | "right" }
  >();
  for (const root of roots) {
    if (root.children.length !== 0) continue;
    const anchor = siblingAnchor(root);
    const side = anchor ? flankSide(anchor, root.members[0]) : null;
    if (anchor && side) rootFlanks.set(root, { anchor, side });
  }

  for (const root of roots) {
    if (visited.has(root)) continue;
    if (rootFlanks.has(root)) continue;
    layoutGroup(root);
  }

  function recenterTopDown() {
    occupied.clear();
    const flankIds = new Set(rootFlanks.keys());

    const order: Group[] = [];
    const seen = new Set<Group>();
    const visit = (g: Group) => {
      if (seen.has(g)) return;
      seen.add(g);
      for (const p of parentGroups.get(g) ?? []) visit(p);
      order.push(g);
    };
    for (const g of groups) visit(g);

    const nonFlankRoots = roots.filter((r) => !flankIds.has(r));
    nonFlankRoots.sort((a, b) => {
      const rank = (g: Group) =>
        groupSide(g) === "left" ? 0 : groupSide(g) === "right" ? 2 : 1;
      return rank(a) - rank(b);
    });

    const placed = new Set<Group>();
    let x = 0;
    for (const g of nonFlankRoots) {
      const n = cols(g);
      g.col = snapCol(n === 1 ? x + 0.5 : x + n / 2, n);
      record(g.row, g.col - n / 2, g.col + n / 2);
      x += n;
      placed.add(g);
    }

    const placeBlock = (g: Group) => {
      if (placed.has(g)) return;
      const parents = parentGroups.get(g) ?? [];
      const row = g.row;

      const sameParentSet = (s: Group) => {
        const sp = parentGroups.get(s) ?? [];
        if (sp.length !== parents.length) return false;
        return sp.every((p) => parents.includes(p));
      };

      const block = groups.filter(
        (s) => !placed.has(s) && s.row === row && sameParentSet(s),
      );

      const primary = parents[0];
      if (parents.length === 1 && primary) {
        const childOrder = childGroups.get(primary) ?? [];
        block.sort((x, y) => childOrder.indexOf(x) - childOrder.indexOf(y));
      }

      const blockWidth = block.reduce((acc, s) => acc + cols(s), 0);

      let left: number;
      if (parents.length === 0) {
        left = x;
        x += blockWidth;
      } else if (parents.length >= 2) {
        const sum = parents.reduce((acc, p) => acc + (p as Group).col, 0);
        left = sum / parents.length - blockWidth / 2;
      } else {
        const P = parents[0] as Group;
        left = P.col - cols(P) / 2;
      }

      let offset = 0;
      for (const s of block) {
        const n = cols(s);
        const center = left + offset + n / 2;
        s.col = snapCol(
          freeCenter(row, center - n / 2, center + n / 2, null),
          n,
        );
        record(row, s.col - n / 2, s.col + n / 2);
        placed.add(s);
        offset += n;
      }
    };

    for (const g of order) if (!flankIds.has(g)) placeBlock(g);
  }

  function applyRootFlanks() {
    const leftCount = new Map<Group, number>();
    const rightCount = new Map<Group, number>();
    for (const [root, { anchor, side }] of rootFlanks) {
      const n = cols(root);
      if (side === "left") {
        const k = leftCount.get(anchor) ?? 0;
        leftCount.set(anchor, k + 1);
        root.col = anchor.col - anchor.members.length / 2 - n / 2 - k;
      } else {
        const k = rightCount.get(anchor) ?? 0;
        rightCount.set(anchor, k + 1);
        root.col = anchor.col + anchor.members.length / 2 + n / 2 + k;
      }
      record(root.row, root.col - n / 2, root.col + n / 2);
    }
  }

  recenterTopDown();
  applyRootFlanks();

  let minLeft = 0;
  for (const group of groups) {
    minLeft = Math.min(minLeft, group.col - cols(group) / 2);
  }
  if (minLeft < 0) {
    for (const group of groups) group.col -= minLeft;
  }

  const cards = new Map<string, CardGrid>();
  const outGroups: GroupGrid[] = [];
  for (const group of groups) {
    const n = cols(group);
    const left = group.col - n / 2;
    outGroups.push({
      members: group.members,
      children: group.children,
      row: group.row,
      col: left,
    });
    group.members.forEach((id, k) => {
      cards.set(id, { row: group.row, col: left + k });
    });
  }

  const siblingIds = siblingGroups.map((members) =>
    members.flatMap((g) => g.members),
  );

  return { cards, groups: outGroups, siblingGroups: siblingIds };
}

export function gridPositions(grid: GridLayout): LayoutResult {
  const topBusPadding = grid.siblingGroups.some((members) =>
    members.every((id) => grid.cards.get(id)?.row === 0),
  )
    ? BUS_OFFSET
    : 0;
  const positions = new Map<string, Point>();
  let maxRight = 0;
  let maxRow = 0;
  for (const [id, card] of grid.cards) {
    const x = MARGIN + card.col * COL_W;
    const y = MARGIN + topBusPadding + card.row * ROW_H;
    positions.set(id, { x, y });
    maxRight = Math.max(maxRight, x + CARD_W);
    maxRow = Math.max(maxRow, card.row);
  }
  const width = Math.max(1, maxRight + MARGIN);
  const height = Math.max(
    1,
    topBusPadding + maxRow * ROW_H + CARD_H + MARGIN * 2,
  );
  return { positions, width, height };
}

export function computeLayout(data: TreeData, pov?: string): LayoutResult {
  return gridPositions(computeGrid(data, pov));
}
