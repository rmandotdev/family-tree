import { describe, expect, it } from "bun:test";
import { computeSubtree } from "./subtree";
import type { Family, Gender, Person, TreeData } from "./types";

function person(id: string, gender: Gender = "unknown"): Person {
  return { id, firstName: id, lastName: "", gender, familyIds: [] };
}

function family(
  id: string,
  husband?: string,
  wife?: string,
  children: string[] = [],
): Family {
  return { id, husbandId: husband, wifeId: wife, childrenIds: children };
}

function tree(people: Person[], families: Family[]): TreeData {
  return {
    people: Object.fromEntries(people.map((p) => [p.id, p])),
    families: Object.fromEntries(families.map((f) => [f.id, f])),
  };
}

function ids(subtree: TreeData): string[] {
  return Object.keys(subtree.people).sort();
}

describe("computeSubtree", () => {
  it("returns an empty tree for an unknown focal person", () => {
    const t = tree([person("a")], []);
    expect(computeSubtree(t, "nope")).toEqual({
      people: {},
      families: {},
    });
  });

  it("returns just the focal person when they have no relatives", () => {
    const t = tree([person("a")], []);
    const sub = computeSubtree(t, "a");
    expect(ids(sub)).toEqual(["a"]);
    expect(sub.families).toEqual({});
  });

  it("includes ancestors, descendants, siblings, and partners but not the in-law's parents", () => {
    const a = person("a");
    const b = person("b");
    const c = person("c");
    const d = person("d");
    const e = person("e");
    const f = person("f");
    const g = person("g");
    const h = person("h");
    const i = person("i");
    const t = tree(
      [a, b, c, d, e, f, g, h, i],
      [
        family("f1", a.id, b.id, [c.id]),
        family("f2", c.id, d.id, [e.id, f.id]),
        family("f3", f.id, g.id, [h.id]),
        family("f4", i.id, undefined, [g.id]),
      ],
    );

    const sub = computeSubtree(t, e.id);

    expect(ids(sub)).toEqual([a, b, c, d, e, f, g, h].map((p) => p.id).sort());
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("does not include the partner's parents or siblings", () => {
    const adam = person("adam");
    const eve = person("eve");
    const john = person("john");
    const mary = person("mary");
    const bob = person("bob");
    const alice = person("alice");
    const charlie = person("charlie");
    const david = person("david");
    const zoe = person("zoe");
    const mark = person("mark");
    const eveLu = person("evelu");
    const fred = person("fred");
    const t = tree(
      [
        adam,
        eve,
        john,
        mary,
        bob,
        alice,
        charlie,
        david,
        zoe,
        mark,
        eveLu,
        fred,
      ],
      [
        family("f1", adam.id, eve.id, [john.id]),
        family("f2", john.id, mary.id, [bob.id, alice.id, charlie.id]),
        family("f3", david.id, alice.id, [zoe.id]),
        family("f4", charlie.id, eveLu.id, [fred.id]),
        family("f5", mark.id, undefined, [david.id]),
      ],
    );

    const sub = computeSubtree(t, alice.id);
    expect(ids(sub)).toEqual(
      [adam, eve, john, mary, bob, alice, charlie, david, zoe, eveLu, fred]
        .map((p) => p.id)
        .sort(),
    );
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f4");
    expect(sub.families).not.toHaveProperty("f5");
  });

  it("excludes the in-law's parents when the focal person is on the other side", () => {
    const adam = person("adam");
    const eve = person("eve");
    const john = person("john");
    const mary = person("mary");
    const bob = person("bob");
    const alice = person("alice");
    const charlie = person("charlie");
    const david = person("david");
    const zoe = person("zoe");
    const mark = person("mark");
    const eveLu = person("evelu");
    const fred = person("fred");
    const t = tree(
      [
        adam,
        eve,
        john,
        mary,
        bob,
        alice,
        charlie,
        david,
        zoe,
        mark,
        eveLu,
        fred,
      ],
      [
        family("f1", adam.id, eve.id, [john.id]),
        family("f2", john.id, mary.id, [bob.id, alice.id, charlie.id]),
        family("f3", david.id, alice.id, [zoe.id]),
        family("f4", charlie.id, eveLu.id, [fred.id]),
        family("f5", mark.id, undefined, [david.id]),
      ],
    );

    const sub = computeSubtree(t, david.id);

    expect(ids(sub)).toEqual([mark, david, alice, zoe].map((p) => p.id).sort());
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f5");
    expect(sub.families).not.toHaveProperty("f1");
    expect(sub.families).not.toHaveProperty("f2");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("does not include the partner's children from another relationship", () => {
    const m = person("m");
    const n = person("n");
    const o = person("o");
    const p = person("p");
    const x = person("x");
    const t = tree(
      [m, n, o, p, x],
      [family("f1", m.id, n.id, [o.id]), family("f2", n.id, x.id, [p.id])],
    );

    const sub = computeSubtree(t, m.id);

    expect(ids(sub)).toEqual([m, n, o].map((p) => p.id).sort());
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).not.toHaveProperty("f2");
  });

  it("limits the depth in both directions", () => {
    const a = person("a");
    const b = person("b");
    const c = person("c");
    const d = person("d");
    const e = person("e");
    const f = person("f");
    const g = person("g");
    const h = person("h");
    const i = person("i");
    const t = tree(
      [a, b, c, d, e, f, g, h, i],
      [
        family("f1", a.id, b.id, [c.id]),
        family("f2", c.id, d.id, [e.id, f.id]),
        family("f3", f.id, g.id, [h.id]),
        family("f4", i.id, undefined, [g.id]),
      ],
    );

    const sub = computeSubtree(t, e.id, { maxDepth: 1 });

    expect(ids(sub)).toEqual([c, d, e, f, g, h].map((p) => p.id).sort());
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).not.toHaveProperty("f1");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("direct mode shows the direct line without siblings' families or aunts/uncles", () => {
    const adam = person("adam");
    const eve = person("eve");
    const john = person("john");
    const mary = person("mary");
    const bob = person("bob");
    const alice = person("alice");
    const charlie = person("charlie");
    const david = person("david");
    const zoe = person("zoe");
    const mark = person("mark");
    const eveLu = person("evelu");
    const fred = person("fred");
    const t = tree(
      [
        adam,
        eve,
        john,
        mary,
        bob,
        alice,
        charlie,
        david,
        zoe,
        mark,
        eveLu,
        fred,
      ],
      [
        family("f1", adam.id, eve.id, [john.id]),
        family("f2", john.id, mary.id, [bob.id, alice.id, charlie.id]),
        family("f3", david.id, alice.id, [zoe.id]),
        family("f4", charlie.id, eveLu.id, [fred.id]),
        family("f5", mark.id, undefined, [david.id]),
      ],
    );

    const sub = computeSubtree(t, zoe.id, { mode: "direct" });

    expect(ids(sub)).toEqual(
      [adam, eve, john, mary, alice, david, zoe, mark].map((p) => p.id).sort(),
    );
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f5");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("directAndChildren mode adds the ancestors' and siblings' children", () => {
    const adam = person("adam");
    const eve = person("eve");
    const john = person("john");
    const mary = person("mary");
    const bob = person("bob");
    const alice = person("alice");
    const charlie = person("charlie");
    const david = person("david");
    const zoe = person("zoe");
    const mark = person("mark");
    const eveLu = person("evelu");
    const fred = person("fred");
    const t = tree(
      [
        adam,
        eve,
        john,
        mary,
        bob,
        alice,
        charlie,
        david,
        zoe,
        mark,
        eveLu,
        fred,
      ],
      [
        family("f1", adam.id, eve.id, [john.id]),
        family("f2", john.id, mary.id, [bob.id, alice.id, charlie.id]),
        family("f3", david.id, alice.id, [zoe.id]),
        family("f4", charlie.id, eveLu.id, [fred.id]),
        family("f5", mark.id, undefined, [david.id]),
      ],
    );

    const sub = computeSubtree(t, zoe.id, { mode: "directAndChildren" });

    expect(ids(sub)).toEqual(
      [adam, eve, john, mary, bob, alice, charlie, david, zoe, mark]
        .map((p) => p.id)
        .sort(),
    );
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("direct mode shows the POV's siblings without their partners and children", () => {
    const john = person("john");
    const mary = person("mary");
    const bob = person("bob");
    const alice = person("alice");
    const zoe = person("zoe");
    const t = tree(
      [john, mary, bob, alice, zoe],
      [
        family("f1", john.id, mary.id, [bob.id, alice.id]),
        family("f2", alice.id, undefined, [zoe.id]),
      ],
    );

    const sub = computeSubtree(t, alice.id, { mode: "direct" });

    expect(ids(sub)).toEqual(
      [john, mary, bob, alice, zoe].map((p) => p.id).sort(),
    );
  });

  it("sorts children in families so female children of direct ancestors are first and male children of direct ancestors are last", () => {
    const grandpaP = person("grandpaP", "male");
    const grandmaP = person("grandmaP", "female");
    const father = person("father", "male");
    const uncleP = person("uncleP", "male");
    const auntP = person("auntP", "male");

    const grandpaM = person("grandpaM", "male");
    const grandmaM = person("grandmaM", "female");
    const mother = person("mother", "female");
    const auntM = person("auntM", "female");
    const uncleM = person("uncleM", "female");

    const pov = person("pov", "female");

    const t = tree(
      [
        grandpaP,
        grandmaP,
        father,
        uncleP,
        grandpaM,
        grandmaM,
        mother,
        auntM,
        pov,
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

    const sub = computeSubtree(t, pov.id);

    expect(sub.families.f1.childrenIds).toEqual(["uncleP", "auntP", "father"]);
    expect(sub.families.f2.childrenIds).toEqual(["mother", "auntM", "uncleM"]);
  });
});
