import type { TreeData } from "./types";

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

export interface CoupleLayout {
  parents: string[];
  col: number;
  row: number;
  children: string[];
}

export interface LayoutResult {
  positions: Map<string, Point>;
  couples: CoupleLayout[];
  width: number;
  height: number;
}

export function computeLayout(data: TreeData): LayoutResult {
  const people = data.people;
  const families = data.families;
  const list = Object.values(people);
  const byId = new Map(list.map((p) => [p.id, p]));
  const couples: CoupleLayout[] = [];
  const coupleOf = new Map<string, CoupleLayout>();
  const assigned = new Set<string>();

  for (const fam of Object.values(families)) {
    const parents = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined && byId.has(id),
    );
    if (parents.length === 0) continue;
    const unassigned = parents.filter((id) => !assigned.has(id));
    if (unassigned.length === 0) continue;
    const couple: CoupleLayout = {
      parents: unassigned,
      col: 0,
      row: 0,
      children: fam.childrenIds.filter((id) => byId.has(id)),
    };
    couples.push(couple);
    for (const id of unassigned) {
      coupleOf.set(id, couple);
      assigned.add(id);
    }
  }

  for (const p of list) {
    if (assigned.has(p.id)) continue;
    const couple: CoupleLayout = {
      parents: [p.id],
      col: 0,
      row: 0,
      children: [],
    };
    couples.push(couple);
    coupleOf.set(p.id, couple);
    assigned.add(p.id);
  }

  const parentCouples = new Map<CoupleLayout, CoupleLayout[]>();
  const childCouples = new Map<CoupleLayout, CoupleLayout[]>();
  for (const couple of couples) {
    parentCouples.set(couple, []);
    childCouples.set(couple, []);
  }
  for (const couple of couples) {
    for (const childId of couple.children) {
      const child = coupleOf.get(childId);
      if (child && child !== couple) {
        parentCouples.get(child)?.push(couple);
        childCouples.get(couple)?.push(child);
      }
    }
  }

  const rows = new Map<CoupleLayout, number>(couples.map((c) => [c, 0]));
  for (let i = 0; i <= couples.length; i++) {
    let changed = false;
    for (const couple of couples) {
      const r = rows.get(couple) ?? 0;
      for (const child of childCouples.get(couple) ?? []) {
        if ((rows.get(child) ?? 0) < r + 1) {
          rows.set(child, r + 1);
          changed = true;
        }
      }
      for (const parent of parentCouples.get(couple) ?? []) {
        if ((rows.get(parent) ?? 0) < r - 1) {
          rows.set(parent, r - 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  for (const couple of couples) couple.row = rows.get(couple) ?? 0;

  const roots = couples.filter(
    (c) => (parentCouples.get(c) ?? []).length === 0,
  );
  const visited = new Set<CoupleLayout>();
  const occupied = new Map<number, Array<[number, number]>>();
  let cursor = 0;
  let maxRow = 0;
  for (const couple of couples) maxRow = Math.max(maxRow, couple.row);

  function cols(couple: CoupleLayout): number {
    return couple.parents.length;
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

  function preferDirection(couple: CoupleLayout): "left" | "right" | null {
    let left = 0;
    let right = 0;
    for (const child of childCouples.get(couple) ?? []) {
      if (child.parents.length !== 2) continue;
      const [husbandId, wifeId] = child.parents;
      const coParents = parentCouples.get(child) ?? [];
      const paternal = coParents.some(
        (p) => p !== couple && p.children.includes(husbandId),
      );
      const maternal = coParents.some(
        (p) => p !== couple && p.children.includes(wifeId),
      );
      if (couple.children.includes(husbandId) && maternal) left++;
      if (couple.children.includes(wifeId) && paternal) right++;
    }
    if (left > right) return "left";
    if (right > left) return "right";
    return null;
  }

  function layoutCouple(couple: CoupleLayout) {
    if (visited.has(couple)) return;
    visited.add(couple);
    const n = cols(couple);
    if (couple.children.length === 0) {
      couple.col = cursor + n / 2;
      cursor += n;
      record(couple.row, couple.col - n / 2, couple.col + n / 2);
      return;
    }

    for (const childId of couple.children) {
      const child = coupleOf.get(childId);
      if (child) layoutCouple(child);
    }

    const first = coupleOf.get(couple.children[0]);
    const last =
      couple.children.length > 1
        ? coupleOf.get(couple.children[couple.children.length - 1])
        : first;
    if (first && last) {
      const dir = preferDirection(couple);
      if (n === 1 && first === last && first.parents.length === 2) {
        couple.col = dir === "right" ? first.col + 0.5 : first.col - 0.5;
      } else {
        couple.col = snapCol((first.col + last.col) / 2, n);
      }
      cursor = Math.max(cursor, couple.col + n / 2);
    } else {
      couple.col = cursor + n / 2;
      cursor += n;
    }

    couple.col = freeCenter(
      couple.row,
      couple.col - n / 2,
      couple.col + n / 2,
      preferDirection(couple),
    );
    record(couple.row, couple.col - n / 2, couple.col + n / 2);
  }

  for (const root of roots) layoutCouple(root);

  let minLeft = 0;
  for (const couple of couples) {
    minLeft = Math.min(minLeft, couple.col - cols(couple) / 2);
  }
  if (minLeft < 0) {
    for (const couple of couples) couple.col -= minLeft;
  }

  const positions = new Map<string, Point>();
  const topBusPadding = Object.values(families).some(
    (fam) =>
      fam.husbandId === undefined &&
      fam.wifeId === undefined &&
      fam.childrenIds.filter((id) => byId.has(id)).length >= 2,
  )
    ? BUS_OFFSET
    : 0;
  let maxRight = 0;
  for (const couple of couples) {
    const n = cols(couple);
    const x = MARGIN + (couple.col - n / 2) * COL_W;
    const y = MARGIN + topBusPadding + couple.row * ROW_H;
    if (n === 1) {
      const [parent] = couple.parents;
      positions.set(parent, { x, y });
      maxRight = Math.max(maxRight, x + CARD_W);
    } else {
      const [a, b] = couple.parents;
      positions.set(a, { x, y });
      positions.set(b, { x: x + COL_W, y });
      maxRight = Math.max(maxRight, x + CARD_W * 2 + CARD_GAP);
    }
  }

  const width = Math.max(1, maxRight + MARGIN);
  const height = Math.max(
    1,
    topBusPadding + maxRow * ROW_H + CARD_H + MARGIN * 2,
  );
  return { positions, couples, width, height };
}
