import { describe, expect, it } from "bun:test";
import type { CardGrid, GridLayout, Point } from "../layout";
import {
  BUS_OFFSET,
  CARD_GAP,
  CARD_H,
  CARD_W,
  COL_W,
  computeGrid,
  computeLayout,
  gridPositions,
  MARGIN,
  ROW_H,
} from "../layout";
import { demoTree, family, person, tree } from "./test-helpers";

function pos(layout: { positions: Map<string, Point> }, id: string): Point {
  const p = layout.positions.get(id);
  if (!p) throw new Error(`missing position for ${id}`);
  return p;
}

function card(grid: GridLayout, id: string): CardGrid {
  const c = grid.cards.get(id);
  if (!c) throw new Error(`missing card for ${id}`);
  return c;
}

describe("computeLayout", () => {
  it("returns a non-empty layout for an empty tree", () => {
    const layout = computeLayout(tree([], []));
    expect(layout.positions.size).toBe(0);
    expect(layout.width).toBeGreaterThanOrEqual(1);
    expect(layout.height).toBeGreaterThanOrEqual(1);
  });

  it("adds top space so a parentless sibling bus is not clipped", () => {
    const a = person("a");
    const b = person("b");
    const layout = computeLayout(
      tree([a, b], [family("f1", undefined, undefined, [a.id, b.id])]),
    );

    expect(pos(layout, a.id).y).toBe(MARGIN + BUS_OFFSET);
    expect(pos(layout, b.id).y).toBe(MARGIN + BUS_OFFSET);
    expect(layout.height).toBe(BUS_OFFSET + CARD_H + MARGIN * 2);
  });

  it("aligns a parentless sibling with its in-couple sibling row", () => {
    const me = person("me");
    const father = person("father", "male");
    const mother = person("mother", "female");
    const grandpa = person("grandpa", "male");
    const uncle = person("uncle", "male");
    const layout = computeLayout(
      tree(
        [me, father, mother, grandpa, uncle],
        [
          family("f1", father.id, mother.id, [me.id]),
          family("f2", grandpa.id, undefined, [father.id]),
          family("f3", undefined, undefined, [mother.id, uncle.id]),
        ],
      ),
    );

    const parentsRow = pos(layout, father.id).y;
    expect(pos(layout, mother.id).y).toBe(parentsRow);
    expect(pos(layout, uncle.id).y).toBe(parentsRow);
    expect(pos(layout, grandpa.id).y).toBeLessThan(parentsRow);
    expect(pos(layout, me.id).y).toBeGreaterThan(parentsRow);
    expect(pos(layout, uncle.id).x).toBe(pos(layout, mother.id).x + COL_W);
    expect(layout.height).toBe(2 * ROW_H + CARD_H + MARGIN * 2);
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
    const grid = computeGrid(tree([a, b], [family("f1", a.id, b.id)]));
    const layout = gridPositions(grid);

    expect(pos(layout, a.id)).toEqual({ x: MARGIN, y: MARGIN });
    expect(pos(layout, b.id)).toEqual({
      x: MARGIN + COL_W,
      y: MARGIN,
    });
    expect(grid.groups[0]?.members).toEqual([a.id, b.id]);
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

  it("places maternal-side grandparents to the right of paternal-side ones", () => {
    const g1 = person("g1", "male");
    const gm1 = person("gm1", "female");
    const p1 = person("p1", "male");
    const p2 = person("p2", "female");
    const c1 = person("c1");
    const c2 = person("c2");
    const c3 = person("c3");
    const m1 = person("m1", "female");
    const layout = computeLayout(
      tree(
        [g1, gm1, p1, p2, c1, c2, c3, m1],
        [
          family("f1", g1.id, gm1.id, [p1.id]),
          family("f2", p1.id, p2.id, [c1.id, c2.id, c3.id]),
          family("f3", undefined, m1.id, [p2.id]),
        ],
      ),
    );

    expect(pos(layout, m1.id).y).toBe(pos(layout, g1.id).y);
    expect(pos(layout, m1.id).x).toBeGreaterThan(pos(layout, gm1.id).x);
  });

  it("keeps a couple on the maternal side to the right of paternal-side grandparents", () => {
    const g1 = person("g1", "male");
    const gm1 = person("gm1", "female");
    const p1 = person("p1", "male");
    const p2 = person("p2", "female");
    const c1 = person("c1");
    const c2 = person("c2");
    const c3 = person("c3");
    const f1 = person("f1", "male");
    const m1 = person("m1", "female");
    const layout = computeLayout(
      tree(
        [g1, gm1, p1, p2, c1, c2, c3, f1, m1],
        [
          family("f1", g1.id, gm1.id, [p1.id]),
          family("f2", p1.id, p2.id, [c1.id, c2.id, c3.id]),
          family("f3", f1.id, m1.id, [p2.id]),
        ],
      ),
    );

    const paternalX = pos(layout, gm1.id).x;
    expect(pos(layout, f1.id).y).toBe(pos(layout, g1.id).y);
    expect(pos(layout, f1.id).x).toBeGreaterThan(paternalX);
    expect(pos(layout, m1.id).x).toBeGreaterThan(pos(layout, f1.id).x);
  });

  it("aligns a person's parents correctly when their partner's family branch pushes them deeper", () => {
    const g1 = person("g1", "male");
    const gm1 = person("gm1", "female");
    const p1 = person("p1", "male");
    const p2 = person("p2", "female");
    const child1 = person("child1", "male");
    const parent1 = person("parent1", "male");
    const parent2 = person("parent2", "female");
    const sibling1 = person("sibling1", "male");

    const layout = computeLayout(
      tree(
        [g1, gm1, p1, p2, child1, parent1, parent2, sibling1],
        [
          family("f1", g1.id, gm1.id, [p1.id]),
          family("f2", p1.id, p2.id, [child1.id]),
          family("f3", parent1.id, parent2.id, [child1.id, sibling1.id]),
        ],
      ),
    );

    const parent1Y = pos(layout, parent1.id).y;
    const child1Y = pos(layout, child1.id).y;
    const sibling1Y = pos(layout, sibling1.id).y;

    expect(parent1Y).toBe(child1Y - ROW_H);
    expect(sibling1Y).toBe(child1Y);
  });
});

describe("computeGrid with a point of view", () => {
  it("does not let Mark Jones overlap John Smith in the demo tree", () => {
    const grid = computeGrid(demoTree(), "john");
    const mark = card(grid, "mark");
    const john = card(grid, "john");
    expect(mark.col).not.toBe(john.col);
  });

  it("keeps the partner's siblings off the POV's side", () => {
    const me = person("me");
    const father = person("father", "male");
    const mother = person("mother", "female");
    const grandpa = person("grandpa", "male");
    const grandma = person("grandma", "female");
    const uncle = person("uncle", "male");
    const aunt = person("aunt", "female");

    const data = tree(
      [me, father, mother, grandpa, grandma, uncle, aunt],
      [
        family("f1", father.id, mother.id, [me.id]),
        family("f2", grandpa.id, undefined, [father.id, uncle.id]),
        family("f3", undefined, grandma.id, [aunt.id, mother.id]),
      ],
    );

    const grid = computeGrid(data, father.id);

    expect(card(grid, "uncle").col).toBeLessThan(card(grid, "father").col);
    expect(card(grid, "aunt").col).toBeGreaterThan(card(grid, "mother").col);
    expect(card(grid, "father").col + 1).toBe(card(grid, "mother").col);
  });

  it("mirrors the arrangement when the POV is the partner", () => {
    const me = person("me");
    const father = person("father", "male");
    const mother = person("mother", "female");
    const grandpa = person("grandpa", "male");
    const grandma = person("grandma", "female");
    const uncle = person("uncle", "male");
    const aunt = person("aunt", "female");

    const data = tree(
      [me, father, mother, grandpa, grandma, uncle, aunt],
      [
        family("f1", father.id, mother.id, [me.id]),
        family("f2", grandpa.id, undefined, [father.id, uncle.id]),
        family("f3", undefined, grandma.id, [mother.id, aunt.id]),
      ],
    );

    const grid = computeGrid(data, mother.id);

    expect(card(grid, "uncle").col).toBeLessThan(card(grid, "father").col);
    expect(card(grid, "father").col + 1).toBe(card(grid, "mother").col);
    expect(card(grid, "aunt").col).toBeGreaterThan(card(grid, "mother").col);
  });

  it("sorts direct-ancestor siblings toward the outside of the POV's partner", () => {
    const pov = person("pov", "female");
    const father = person("father", "male");
    const mother = person("mother", "female");
    const grandpaP = person("grandpaP", "male");
    const grandmaP = person("grandmaP", "female");
    const grandpaM = person("grandpaM", "male");
    const grandmaM = person("grandmaM", "female");
    const uncleP = person("uncleP", "male");
    const auntP = person("auntP", "male");
    const auntM = person("auntM", "female");
    const uncleM = person("uncleM", "female");

    const data = tree(
      [
        pov,
        father,
        mother,
        grandpaP,
        grandmaP,
        grandpaM,
        grandmaM,
        uncleP,
        auntP,
        auntM,
        uncleM,
      ],
      [
        family("f1", grandpaP.id, grandmaP.id, [
          uncleP.id,
          father.id,
          auntP.id,
        ]),
        family("f2", grandpaM.id, grandmaM.id, [
          auntM.id,
          mother.id,
          uncleM.id,
        ]),
        family("f3", father.id, mother.id, [pov.id]),
      ],
    );

    const grid = computeGrid(data, pov.id);

    expect(card(grid, "father").col).toBeGreaterThan(card(grid, "uncleP").col);
    expect(card(grid, "father").col).toBeGreaterThan(card(grid, "auntP").col);
    expect(card(grid, "mother").col).toBeLessThan(card(grid, "auntM").col);
    expect(card(grid, "mother").col).toBeLessThan(card(grid, "uncleM").col);
  });

  it("orders uncle, dad, mom, aunt left to right when dad's side has a single parent and mom's has none", () => {
    const me = person("me");
    const dad = person("dad", "male");
    const mom = person("mom", "female");
    const uncle = person("uncle", "male");
    const aunt = person("aunt", "female");
    const grandma = person("grandma", "female");

    const data = tree(
      [me, dad, mom, uncle, aunt, grandma],
      [
        family("f1", dad.id, mom.id, [me.id]),
        family("f2", undefined, grandma.id, [uncle.id, dad.id]),
        family("f3", undefined, undefined, [mom.id, aunt.id]),
      ],
    );

    const grid = computeGrid(data, me.id);

    expect(card(grid, "uncle").col).toBeLessThan(card(grid, "dad").col);
    expect(card(grid, "dad").col).toBeLessThan(card(grid, "mom").col);
    expect(card(grid, "mom").col).toBeLessThan(card(grid, "aunt").col);
  });

  it("places a father's sibling to the left of the father when parents are absent", () => {
    const me = person("me");
    const dad = person("dad", "male");
    const mom = person("mom", "female");
    const aunt = person("aunt", "female");

    const data = tree(
      [me, dad, mom, aunt],
      [
        family("f1", dad.id, mom.id, [me.id]),
        family("f2", undefined, undefined, [dad.id, aunt.id]),
      ],
    );

    const grid = computeGrid(data, me.id);

    expect(card(grid, "aunt").col).toBeLessThan(card(grid, "dad").col);
    expect(card(grid, "dad").col + 1).toBe(card(grid, "mom").col);
  });

  it("places a mother's sibling to the right of the mother when parents are absent", () => {
    const me = person("me");
    const dad = person("dad", "male");
    const mom = person("mom", "female");
    const aunt = person("aunt", "female");

    const data = tree(
      [me, dad, mom, aunt],
      [
        family("g1", dad.id, mom.id, [me.id]),
        family("g2", undefined, undefined, [mom.id, aunt.id]),
      ],
    );

    const grid = computeGrid(data, me.id);

    expect(card(grid, "aunt").col).toBeGreaterThan(card(grid, "mom").col);
    expect(card(grid, "dad").col + 1).toBe(card(grid, "mom").col);
  });

  it("keeps paternal great-grandparents as a left block with granddad's parents left of grandmom's", () => {
    const me = person("me");
    const dad = person("dad", "male");
    const mom = person("mom", "female");
    const gd = person("gd", "male");
    const gmd = person("gmd", "female");
    const gm = person("gm", "male");
    const gmm = person("gmm", "female");
    const ggd1 = person("ggd1", "male");
    const ggmd1 = person("ggmd1", "female");
    const ggd2 = person("ggd2", "male");
    const ggmd2 = person("ggmd2", "female");
    const ggm1 = person("ggm1", "male");
    const ggmm1 = person("ggmm1", "female");
    const ggm2 = person("ggm2", "male");
    const ggmm2 = person("ggmm2", "female");

    const data = tree(
      [
        me,
        dad,
        mom,
        gd,
        gmd,
        gm,
        gmm,
        ggd1,
        ggmd1,
        ggd2,
        ggmd2,
        ggm1,
        ggmm1,
        ggm2,
        ggmm2,
      ],
      [
        family("f1", dad.id, mom.id, [me.id]),
        family("f2", gd.id, gmd.id, [dad.id]),
        family("f3", gm.id, gmm.id, [mom.id]),
        family("f4", ggd1.id, ggmd1.id, [gd.id]),
        family("f5", ggd2.id, ggmd2.id, [gmd.id]),
        family("f6", ggm1.id, ggmm1.id, [gm.id]),
        family("f7", ggm2.id, ggmm2.id, [gmm.id]),
      ],
    );

    const grid = computeGrid(data, me.id);

    // Dad's four great-grandparents form a contiguous left block.
    const row0 = [
      ggd1.id,
      ggmd1.id,
      ggd2.id,
      ggmd2.id,
      ggm1.id,
      ggmm1.id,
      ggm2.id,
      ggmm2.id,
    ]
      .map((id) => card(grid, id).col)
      .sort((x, y) => x - y);
    expect(row0).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    // Within dad's block, granddad's parents sit left of grandmom's.
    expect(card(grid, "ggd2").col).toBeGreaterThan(card(grid, "ggd1").col);
    expect(card(grid, "ggmd2").col).toBeGreaterThan(card(grid, "ggmd1").col);

    // Dad and mom are centered between both grandparent pairs.
    expect(card(grid, "dad").col + 1).toBe(card(grid, "mom").col);
    expect(card(grid, "dad").col).toBeGreaterThan(card(grid, "gd").col);
    expect(card(grid, "mom").col).toBeLessThan(card(grid, "gm").col);

    // Mom's great-grandparents stay to the right of dad's.
    expect(card(grid, "ggm1").col).toBeGreaterThan(card(grid, "ggd2").col);

    // The focal person is horizontally centered.
    expect(card(grid, "me").col).toBe(3);
  });

  function completeTree(gens: number): {
    data: ReturnType<typeof tree>;
    me: string;
    dad: string;
    mom: string;
    topRow: string[];
  } {
    const people = [person("p0_0")];
    const families = [];
    for (let level = 0; level < gens; level++) {
      const count = 2 ** level;
      for (let j = 0; j < count; j++) {
        const child = `p${level}_${j}`;
        const h = `p${level + 1}_${2 * j}`;
        const w = `p${level + 1}_${2 * j + 1}`;
        people.push(person(h, "male"), person(w, "female"));
        families.push(family(`f${level}_${j}`, h, w, [child]));
      }
    }
    const topRow = Array.from({ length: 2 ** gens }, (_, j) => `p${gens}_${j}`);
    return {
      data: tree(people, families),
      me: "p0_0",
      dad: "p1_0",
      mom: "p1_1",
      topRow,
    };
  }

  it.each([4, 5, 6, 7])(
    "keeps a complete %i-generation tree symmetric and centered",
    (gens) => {
      const { data, me, dad, mom, topRow } = completeTree(gens);
      const grid = computeGrid(data, me);

      // Every ancestor survives, with no card lost or overlapping another.
      expect(grid.cards.size).toBe(2 ** (gens + 1) - 1);

      // The focal person sits under their father, just left of the tree's center.
      expect(card(grid, me).col).toBe(2 ** (gens - 1) - 1);

      // The top (outermost) row is a contiguous block starting at column 0.
      const row0 = topRow.map((id) => card(grid, id).col);
      expect(Math.min(...row0)).toBe(0);
      expect(Math.max(...row0)).toBe(2 ** gens - 1);
      expect(new Set(row0).size).toBe(row0.length);

      // Paternal side stays to the left of the maternal side.
      expect(card(grid, dad).col).toBeLessThan(card(grid, mom).col);
    },
  );

  function parentGrandparentTree(extra: {
    childId: string;
  }): ReturnType<typeof tree> {
    const me = person("me");
    const dad = person("dad", "male");
    const mom = person("mom", "female");
    const gd = person("gd", "male");
    const gmd = person("gmd", "female");
    const gm = person("gm", "male");
    const gmm = person("gmm", "female");
    const gg = person(extra.childId, "male");
    const families: ReturnType<typeof family>[] = [
      family("f1", dad.id, mom.id, [me.id]),
      family("f2", gd.id, gmd.id, [dad.id]),
      family("f3", gm.id, gmm.id, [mom.id]),
    ];
    const parentOf: Record<string, string> = {
      ggd: gd.id,
      ggmd: gmd.id,
      ggm: gm.id,
      ggmm: gmm.id,
    };
    families.push(family("f4", gg.id, undefined, [parentOf[gg.id]]));
    return tree([me, dad, mom, gd, gmd, gm, gmm, gg], families);
  }

  it.each([
    ["ggd", "gd", 0],
    ["ggmd", "gmd", 1],
    ["ggm", "gm", 2],
    ["ggmm", "gmm", 3],
  ] as const)(
    "aligns a single great-grandparent %s over their child %s",
    (ggId, grandparentId, expectedCol) => {
      const data = parentGrandparentTree({ childId: ggId });
      const grid = computeGrid(data, "me");

      expect(card(grid, ggId).col).toBe(expectedCol);
      expect(card(grid, ggId).col).toBe(card(grid, grandparentId).col);
      // The focal person still sits under their father, keeping the tree centered.
      expect(card(grid, "me").col).toBe(1);
    },
  );
});
