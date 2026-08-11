import { describe, expect, it } from "bun:test";
import type { GroupGrid, Point } from "../layout";
import {
  BUS_OFFSET,
  BUS_STEP,
  CARD_GAP,
  CARD_H,
  CARD_W,
  COL_W,
  ROW_H,
} from "../layout";
import {
  childSegments,
  connectionSegments,
  partnerSegments,
  siblingSegments,
} from "../lines";

function positions(entries: Array<[string, Point]>): Map<string, Point> {
  return new Map(entries);
}

function group(members: string[], children: string[]): GroupGrid {
  return { members, col: 0, row: 0, children };
}

describe("partnerSegments", () => {
  it("draws a line between the centers of both partners", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
    ]);

    expect(partnerSegments(map, [group(["a", "b"], [])])).toEqual([
      `M ${CARD_W / 2} ${CARD_H / 2} L ${COL_W + CARD_W / 2} ${CARD_H / 2}`,
    ]);
  });

  it("skips couples with a missing position", () => {
    const map = positions([["a", { x: 0, y: 0 }]]);

    expect(partnerSegments(map, [group(["a", "b"], [])])).toEqual([]);
  });
});

describe("childSegments", () => {
  it("connects a couple to each child through a shared bus", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
      ["c1", { x: 0, y: ROW_H }],
      ["c2", { x: COL_W, y: ROW_H }],
    ]);

    const busY = ROW_H - BUS_OFFSET;
    const minX = CARD_W / 2;
    const maxX = COL_W + CARD_W / 2;
    expect(childSegments(map, [group(["a", "b"], ["c1", "c2"])])).toEqual([
      `M ${CARD_W + CARD_GAP / 2} ${CARD_H / 2} V ${busY}`,
      `M ${minX} ${busY} H ${maxX}`,
      `M ${minX} ${busY} V ${ROW_H}`,
      `M ${maxX} ${busY} V ${ROW_H}`,
    ]);
  });

  it("spans the bus between a couple and its single child", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
      ["c", { x: 0, y: ROW_H }],
    ]);

    const busY = ROW_H - BUS_OFFSET;
    const midX = CARD_W + CARD_GAP / 2;
    const childX = CARD_W / 2;
    expect(childSegments(map, [group(["a", "b"], ["c"])])).toEqual([
      `M ${midX} ${CARD_H / 2} V ${busY}`,
      `M ${childX} ${busY} H ${midX}`,
      `M ${childX} ${busY} V ${ROW_H}`,
    ]);
  });

  it("drops a line from a single parent to the bus", () => {
    const map = positions([
      ["p", { x: 0, y: 0 }],
      ["c", { x: 0, y: ROW_H }],
    ]);

    const busY = ROW_H - BUS_OFFSET;
    expect(childSegments(map, [group(["p"], ["c"])])).toEqual([
      `M ${CARD_W / 2} ${CARD_H} V ${busY}`,
      `M ${CARD_W / 2} ${busY} H ${CARD_W / 2}`,
      `M ${CARD_W / 2} ${busY} V ${ROW_H}`,
    ]);
  });

  it("raises an unrelated bus that overlaps another bus", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
      ["c1", { x: 0, y: ROW_H }],
      ["c2", { x: COL_W, y: ROW_H }],
      ["p", { x: 0, y: 0 }],
      ["d", { x: CARD_W, y: ROW_H }],
    ]);

    const busY = ROW_H - BUS_OFFSET;
    expect(
      childSegments(map, [
        group(["a", "b"], ["c1", "c2"]),
        group(["p"], ["d"]),
      ]),
    ).toEqual([
      `M ${CARD_W + CARD_GAP / 2} ${CARD_H / 2} V ${busY}`,
      `M ${CARD_W / 2} ${busY} H ${COL_W + CARD_W / 2}`,
      `M ${CARD_W / 2} ${busY} V ${ROW_H}`,
      `M ${COL_W + CARD_W / 2} ${busY} V ${ROW_H}`,
      `M ${CARD_W / 2} ${CARD_H} V ${busY - BUS_STEP}`,
      `M ${CARD_W / 2} ${busY - BUS_STEP} H ${CARD_W + CARD_W / 2}`,
      `M ${CARD_W + CARD_W / 2} ${busY - BUS_STEP} V ${ROW_H}`,
    ]);
  });

  it("skips couples whose positions are missing", () => {
    const map = positions([
      ["b", { x: COL_W, y: 0 }],
      ["c1", { x: 0, y: ROW_H }],
      ["c2", { x: COL_W, y: ROW_H }],
    ]);

    expect(childSegments(map, [group(["a", "b"], ["c1", "c2"])])).toEqual([]);
  });

  it("emits nothing for couples without children", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
    ]);

    expect(childSegments(map, [group(["a", "b"], [])])).toEqual([]);
  });
});

describe("siblingSegments", () => {
  it("connects siblings through a bus with no vertical line to parents", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
    ]);

    const busY = -BUS_OFFSET;
    const minX = CARD_W / 2;
    const maxX = COL_W + CARD_W / 2;
    expect(siblingSegments(map, [["a", "b"]])).toEqual([
      `M ${minX} ${busY} H ${maxX}`,
      `M ${minX} ${busY} V 0`,
      `M ${maxX} ${busY} V 0`,
    ]);
  });

  it("emits nothing for a group with a single sibling", () => {
    const map = positions([["a", { x: 0, y: 0 }]]);

    expect(siblingSegments(map, [["a"]])).toEqual([]);
  });

  it("emits nothing when sibling positions are missing", () => {
    const map = positions([["a", { x: 0, y: 0 }]]);

    expect(siblingSegments(map, [["a", "b"]])).toEqual([]);
  });
});

describe("connectionSegments", () => {
  it("emits partner segments before child segments", () => {
    const map = positions([
      ["a", { x: 0, y: 0 }],
      ["b", { x: COL_W, y: 0 }],
      ["c", { x: 0, y: ROW_H }],
    ]);
    const couples = [group(["a", "b"], ["c"])];

    const segments = connectionSegments(map, couples);
    expect(segments).toEqual([
      ...partnerSegments(map, couples),
      ...childSegments(map, couples),
    ]);
  });
});
