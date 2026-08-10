import { describe, expect, it } from "bun:test";
import type { Point } from "./layout";
import {
  CARD_GAP,
  CARD_H,
  CARD_W,
  COL_W,
  computeLayout,
  MARGIN,
  ROW_H,
} from "./layout";
import type { Family, Gender, Person, TreeData } from "./types";

function person(id: string, gender: Gender = "unknown"): Person {
  return { id, firstName: id, lastName: "", gender, familyIds: [] };
}

function family(
  id: string,
  husband: string,
  wife: string | undefined,
  children: string[] = [],
): Family {
  return { id, husbandId: husband, wifeId: wife, childrenIds: children };
}

function tree(people: Person[], families: Family[]): TreeData {
  return {
    people: Object.fromEntries(people.map((p) => [p.id, p])),
    families: Object.fromEntries(families.map((f) => [f.id, f])),
    sourceId: null,
  };
}

function pos(layout: { positions: Map<string, Point> }, id: string): Point {
  const p = layout.positions.get(id);
  if (!p) throw new Error(`missing position for ${id}`);
  return p;
}

describe("computeLayout", () => {
  it("returns a non-empty layout for an empty tree", () => {
    const layout = computeLayout(tree([], []));
    expect(layout.positions.size).toBe(0);
    expect(layout.width).toBeGreaterThanOrEqual(1);
    expect(layout.height).toBeGreaterThanOrEqual(1);
  });

  it("positions a single unpaired person at the margin", () => {
    const layout = computeLayout(tree([person("a")], []));
    expect(pos(layout, "a")).toEqual({ x: MARGIN, y: MARGIN });
    expect(layout.width).toBe(CARD_W + MARGIN * 2);
    expect(layout.height).toBe(CARD_H + MARGIN * 2);
  });

  it("positions a childless couple side by side", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const layout = computeLayout(tree([a, b], [family("f1", a.id, b.id)]));

    expect(pos(layout, a.id)).toEqual({ x: MARGIN, y: MARGIN });
    expect(pos(layout, b.id)).toEqual({
      x: MARGIN + COL_W,
      y: MARGIN,
    });
    expect(layout.couples[0].parents).toEqual([a.id, b.id]);
    expect(layout.width).toBe(CARD_W * 2 + CARD_GAP + MARGIN * 2);
    expect(layout.height).toBe(CARD_H + MARGIN * 2);
  });

  it("places children one row below their parents", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c1 = person("c1");
    const c2 = person("c2");
    const layout = computeLayout(
      tree([a, b, c1, c2], [family("f1", a.id, b.id, [c1.id, c2.id])]),
    );

    const parentY = pos(layout, a.id).y;
    expect(pos(layout, c1.id).y).toBe(parentY + ROW_H);
    expect(pos(layout, c2.id).y).toBe(parentY + ROW_H);
  });

  it("snaps sibling cards to the grid with a sibling gap between them", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c1 = person("c1");
    const c2 = person("c2");
    const c3 = person("c3");
    const layout = computeLayout(
      tree(
        [a, b, c1, c2, c3],
        [family("f1", a.id, b.id, [c1.id, c2.id, c3.id])],
      ),
    );

    const s1 = pos(layout, c1.id);
    const s2 = pos(layout, c2.id);
    const s3 = pos(layout, c3.id);
    expect(s2.x - s1.x).toBe(COL_W);
    expect(s3.x - s2.x).toBe(COL_W);
    expect(s1.x).toBe(MARGIN);
    expect((s2.x - MARGIN) % COL_W).toBe(0);
    expect((s3.x - MARGIN) % COL_W).toBe(0);
  });

  it("centers children over the couple's column span", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c1 = person("c1");
    const c2 = person("c2");
    const layout = computeLayout(
      tree([a, b, c1, c2], [family("f1", a.id, b.id, [c1.id, c2.id])]),
    );

    expect(pos(layout, c1.id).x).toBe(MARGIN);
    expect(pos(layout, c2.id).x).toBe(MARGIN + COL_W);
  });

  it("aligns cards of descendant couples to the same columns", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c = person("c", "male");
    const d = person("d", "female");
    const e = person("e");
    const layout = computeLayout(
      tree(
        [a, b, c, d, e],
        [family("f1", a.id, b.id, [c.id]), family("f2", c.id, d.id, [e.id])],
      ),
    );

    expect(pos(layout, a.id)).toEqual({ x: MARGIN, y: MARGIN });
    expect(pos(layout, c.id)).toEqual({ x: MARGIN, y: MARGIN + ROW_H });
    expect(pos(layout, e.id)).toEqual({
      x: MARGIN,
      y: MARGIN + ROW_H * 2,
    });
    expect(pos(layout, a.id).x).toBe(pos(layout, c.id).x);
    expect(pos(layout, c.id).x).toBe(pos(layout, e.id).x);
  });

  it("does not overlap sibling couples that each have children", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c1 = person("c1", "male");
    const d1 = person("d1", "female");
    const c2 = person("c2", "male");
    const d2 = person("d2", "female");
    const k1 = person("k1");
    const k2 = person("k2");
    const layout = computeLayout(
      tree(
        [a, b, c1, d1, c2, d2, k1, k2],
        [
          family("f1", a.id, b.id, [c1.id, c2.id]),
          family("f2", c1.id, d1.id, [k1.id]),
          family("f3", c2.id, d2.id, [k2.id]),
        ],
      ),
    );

    const c1Right = pos(layout, c1.id).x + COL_W + CARD_W;
    expect(c1Right).toBeLessThanOrEqual(pos(layout, c2.id).x);
    const k1Right = pos(layout, k1.id).x + CARD_W;
    expect(k1Right).toBeLessThanOrEqual(pos(layout, k2.id).x);
  });

  it("lowers each generation by a row height", () => {
    const g = person("g", "male");
    const gm = person("gm", "female");
    const p = person("p", "male");
    const pm = person("pm", "female");
    const c = person("c");
    const layout = computeLayout(
      tree(
        [g, gm, p, pm, c],
        [family("f1", g.id, gm.id, [p.id]), family("f2", p.id, pm.id, [c.id])],
      ),
    );

    const grandparentY = pos(layout, g.id).y;
    const parentY = pos(layout, p.id).y;
    const childY = pos(layout, c.id).y;
    expect(parentY).toBe(grandparentY + ROW_H);
    expect(childY).toBe(parentY + ROW_H);
  });

  it("lays out multiple roots side by side on the same row", () => {
    const a = person("a");
    const b = person("b");
    const layout = computeLayout(tree([a, b], []));

    const pa = pos(layout, a.id);
    const pb = pos(layout, b.id);
    expect(pb.y).toBe(pa.y);
    expect(pb.x - pa.x).toBe(COL_W);
  });

  it("places a single parent on the row above its child's couple", () => {
    const g = person("g", "male");
    const gm = person("gm", "female");
    const a = person("a", "male");
    const b = person("b", "female");
    const c = person("c", "male");
    const d = person("d", "female");
    const e = person("e");
    const p = person("p", "male");
    a.parentFamilyId = "f0";
    b.parentFamilyId = "f0";
    c.parentFamilyId = "f1";
    e.parentFamilyId = "f2";
    const layout = computeLayout(
      tree(
        [g, gm, a, b, c, d, e, p],
        [
          family("f0", g.id, gm.id, [a.id, b.id]),
          family("f1", a.id, b.id, [c.id]),
          family("f2", c.id, d.id, [e.id]),
          family("f3", p.id, undefined, [c.id]),
        ],
      ),
    );

    const parentPos = pos(layout, p.id);
    const childPos = pos(layout, c.id);
    expect(parentPos.y).toBe(childPos.y - ROW_H);
    expect(parentPos.x + CARD_W).toBeLessThanOrEqual(pos(layout, a.id).x);
  });

  it("reports dimensions that fit the laid out content", () => {
    const a = person("a", "male");
    const b = person("b", "female");
    const c = person("c", "male");
    const d = person("d", "female");
    const e = person("e");
    const layout = computeLayout(
      tree(
        [a, b, c, d, e],
        [family("f1", a.id, b.id, [c.id]), family("f2", c.id, d.id, [e.id])],
      ),
    );

    expect(layout.width).toBe(CARD_W * 2 + CARD_GAP + MARGIN * 2);
    expect(layout.height).toBe(ROW_H * 2 + CARD_H + MARGIN * 2);
  });
});
