import type { GroupGrid, Point } from "./layout";
import { BUS_OFFSET, BUS_STEP, CARD_H, CARD_W } from "./layout";

function center(id: string, positions: Map<string, Point>): Point | null {
  const p = positions.get(id);
  return p ? { x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 } : null;
}

interface BusAllocator {
  alloc(x1: number, x2: number, baseY: number): number;
}

function createBusAllocator(): BusAllocator {
  const buses: Array<[number, number, number]> = [];
  function overlaps(y: number, x1: number, x2: number): boolean {
    return buses.some(([by, bx1, bx2]) => by === y && x1 < bx2 && x2 > bx1);
  }
  return {
    alloc(x1, x2, baseY) {
      let y = baseY;
      while (overlaps(y, x1, x2)) y -= BUS_STEP;
      buses.push([y, x1, x2]);
      return y;
    },
  };
}

export function partnerSegments(
  positions: Map<string, Point>,
  groups: GroupGrid[],
): string[] {
  const out: string[] = [];
  for (const group of groups) {
    if (group.members.length !== 2) continue;
    const a = center(group.members[0], positions);
    const b = center(group.members[1], positions);
    if (!a || !b) continue;
    out.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
  }
  return out;
}

export function childSegments(
  positions: Map<string, Point>,
  groups: GroupGrid[],
  buses: BusAllocator = createBusAllocator(),
): string[] {
  const out: string[] = [];
  for (const group of groups) {
    if (group.children.length === 0) continue;
    const tops = group.children
      .map((id) => positions.get(id))
      .filter((p) => p !== undefined);
    if (tops.length === 0) continue;
    const xs = tops.map((p) => p.x + CARD_W / 2);
    const topY = tops[0].y;
    const baseY = topY - BUS_OFFSET;

    let midX: number;
    let botY: number;
    if (group.members.length === 2) {
      const a = center(group.members[0], positions);
      const b = center(group.members[1], positions);
      if (!a || !b) continue;
      midX = (a.x + b.x) / 2;
      botY = a.y;
    } else {
      const p = positions.get(group.members[0]);
      if (!p) continue;
      midX = p.x + CARD_W / 2;
      botY = p.y + CARD_H;
    }

    const minX = Math.min(midX, ...xs);
    const maxX = Math.max(midX, ...xs);
    const busY = buses.alloc(minX, maxX, baseY);
    out.push(`M ${midX} ${botY} V ${busY}`);
    out.push(`M ${minX} ${busY} H ${maxX}`);
    for (const x of xs) {
      out.push(`M ${x} ${busY} V ${topY}`);
    }
  }
  return out;
}

export function siblingSegments(
  positions: Map<string, Point>,
  siblingGroups: Array<string[]>,
  buses: BusAllocator = createBusAllocator(),
): string[] {
  const out: string[] = [];
  for (const group of siblingGroups) {
    const tops = group
      .map((id) => positions.get(id))
      .filter((p) => p !== undefined);
    if (tops.length < 2) continue;
    const xs = tops.map((p) => p.x + CARD_W / 2);
    const topY = tops[0].y;
    const baseY = topY - BUS_OFFSET;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const busY = buses.alloc(minX, maxX, baseY);
    out.push(`M ${minX} ${busY} H ${maxX}`);
    for (const x of xs) {
      out.push(`M ${x} ${busY} V ${topY}`);
    }
  }
  return out;
}

export function connectionSegments(
  positions: Map<string, Point>,
  groups: GroupGrid[],
  siblingGroups: Array<string[]> = [],
): string[] {
  const buses = createBusAllocator();
  return [
    ...partnerSegments(positions, groups),
    ...childSegments(positions, groups, buses),
    ...siblingSegments(positions, siblingGroups, buses),
  ];
}
