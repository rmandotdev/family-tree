import type { Person } from "./types";

export const CARD_W = 160;
export const CARD_H = 90;
export const SPOUSE_GAP = 24;
export const SIBLING_GAP = 56;
export const ROW_H = 260;
export const BUS_OFFSET = 40;
const MARGIN = 24;

export interface Point {
  x: number;
  y: number;
}

export interface CoupleLayout {
  parents: string[];
  x: number;
  y: number;
  children: string[];
}

export interface LayoutResult {
  positions: Map<string, Point>;
  couples: CoupleLayout[];
  width: number;
  height: number;
}

export function computeLayout(people: Record<string, Person>): LayoutResult {
  const list = Object.values(people);
  const byId = new Map(list.map((p) => [p.id, p]));
  const couples: CoupleLayout[] = [];
  const coupleOf = new Map<string, CoupleLayout>();
  const assigned = new Set<string>();

  for (const p of list) {
    if (assigned.has(p.id)) continue;
    const spouseId = p.spouseIds.find((id) => !assigned.has(id));
    if (spouseId) {
      const couple: CoupleLayout = {
        parents: [p.id, spouseId],
        x: 0,
        y: 0,
        children: [],
      };
      couples.push(couple);
      coupleOf.set(p.id, couple);
      coupleOf.set(spouseId, couple);
      assigned.add(p.id);
      assigned.add(spouseId);
    } else {
      const couple: CoupleLayout = {
        parents: [p.id],
        x: 0,
        y: 0,
        children: [],
      };
      couples.push(couple);
      coupleOf.set(p.id, couple);
      assigned.add(p.id);
    }
  }

  const childCouples = new Set<CoupleLayout>();
  for (const p of list) {
    const childCouple = coupleOf.get(p.id);
    const parentId = p.parentIds.find((id) => byId.has(id));
    if (!childCouple || !parentId) continue;
    const parentCouple = coupleOf.get(parentId);
    if (parentCouple && parentCouple !== childCouple) {
      if (!parentCouple.children.includes(p.id))
        parentCouple.children.push(p.id);
      childCouples.add(parentCouple);
    }
  }

  const roots = couples.filter((c) => !childCouples.has(c));

  const positions = new Map<string, Point>();
  let cursor = 0;
  let maxY = 0;

  function coupleWidth(couple: CoupleLayout): number {
    return couple.parents.length === 2 ? CARD_W * 2 + SPOUSE_GAP : CARD_W;
  }

  function layoutCouple(couple: CoupleLayout, y: number) {
    couple.y = y;
    if (couple.children.length === 0) {
      couple.x = cursor + coupleWidth(couple) / 2;
      cursor += coupleWidth(couple) + SIBLING_GAP;
    } else {
      for (const childId of couple.children) {
        const childCouple = coupleOf.get(childId);
        if (childCouple) layoutCouple(childCouple, y + ROW_H);
      }
      const first = couple.children[0]
        ? coupleOf.get(couple.children[0])
        : undefined;
      const last =
        couple.children.length > 1
          ? coupleOf.get(couple.children[couple.children.length - 1])
          : first;
      if (first && last) couple.x = (first.x + last.x) / 2;
    }
    maxY = Math.max(maxY, y);
  }

  for (const root of roots) layoutCouple(root, 0);

  for (const couple of couples) {
    const x = couple.x + MARGIN;
    const y = couple.y + MARGIN;
    if (couple.parents.length === 1) {
      const [parent] = couple.parents;
      positions.set(parent, { x: x - CARD_W / 2, y });
    } else {
      const [a, b] = couple.parents;
      positions.set(a, { x: x - coupleWidth(couple) / 2, y });
      positions.set(b, { x: x + SPOUSE_GAP / 2, y });
    }
  }

  const width = Math.max(1, cursor + MARGIN);
  const height = Math.max(1, maxY + CARD_H + MARGIN * 2);
  return { positions, couples, width, height };
}
