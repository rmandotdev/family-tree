import { describe, expect, it } from "bun:test";
import { computeSubtree } from "../subtree";
import { demoTree, family, ids, person, tree } from "./test-helpers";

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
    const t = demoTree();

    const sub = computeSubtree(t, "alice");
    expect(ids(sub)).toEqual(
      [
        "adam",
        "eve",
        "john",
        "mary",
        "bob",
        "alice",
        "charlie",
        "david",
        "zoe",
        "evelu",
        "fred",
      ].sort(),
    );
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f4");
    expect(sub.families).not.toHaveProperty("f5");
  });

  it("excludes the in-law's parents when the focal person is on the other side", () => {
    const t = demoTree();

    const sub = computeSubtree(t, "david");

    expect(ids(sub)).toEqual(["alice", "david", "mark", "zoe"].sort());
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
    const t = demoTree();

    const sub = computeSubtree(t, "zoe", { mode: "direct" });

    expect(ids(sub)).toEqual(
      ["adam", "eve", "john", "mary", "alice", "david", "zoe", "mark"].sort(),
    );
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f5");
    expect(sub.families).not.toHaveProperty("f4");
  });

  it("directAndChildren mode adds the ancestors' and siblings' children", () => {
    const t = demoTree();

    const sub = computeSubtree(t, "zoe", { mode: "directAndChildren" });

    expect(ids(sub)).toEqual(
      [
        "adam",
        "eve",
        "john",
        "mary",
        "bob",
        "alice",
        "charlie",
        "david",
        "zoe",
        "mark",
      ].sort(),
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

  it("includes siblings from a family with no parents", () => {
    const alice = person("alice");
    const bob = person("bob");
    const t = tree(
      [alice, bob],
      [family("f1", undefined, undefined, [alice.id, bob.id])],
    );

    const sub = computeSubtree(t, alice.id);

    expect(ids(sub)).toEqual([alice.id, bob.id].sort());
    expect(sub.families).toHaveProperty("f1");
  });

  it("includes the children of siblings from a parentless family in all mode", () => {
    const alice = person("alice");
    const bob = person("bob");
    const dan = person("dan");
    const t = tree(
      [alice, bob, dan],
      [
        family("f1", undefined, undefined, [alice.id, bob.id]),
        family("f2", bob.id, undefined, [dan.id]),
      ],
    );

    const sub = computeSubtree(t, alice.id);

    expect(ids(sub)).toEqual([alice.id, bob.id, dan.id].sort());
  });

  it("includes a parentless sibling in direct mode", () => {
    const alice = person("alice");
    const bob = person("bob");
    const t = tree(
      [alice, bob],
      [family("f1", undefined, undefined, [alice.id, bob.id])],
    );

    const sub = computeSubtree(t, alice.id, { mode: "direct" });

    expect(ids(sub)).toEqual([alice.id, bob.id].sort());
    expect(sub.families).toHaveProperty("f1");
  });

  it("directAndChildren mode adds the parentless siblings' children", () => {
    const alice = person("alice");
    const bob = person("bob");
    const dan = person("dan");
    const t = tree(
      [alice, bob, dan],
      [
        family("f1", undefined, undefined, [alice.id, bob.id]),
        family("f2", bob.id, undefined, [dan.id]),
      ],
    );

    const sub = computeSubtree(t, alice.id, { mode: "directAndChildren" });

    expect(ids(sub)).toEqual([alice.id, bob.id, dan.id].sort());
  });

  it("includes siblings' children without displaying siblings' partners in directAndChildren mode", () => {
    const t = demoTree();
    const sub = computeSubtree(t, "bob", { mode: "directAndChildren" });

    expect(ids(sub)).toEqual(
      [
        "adam",
        "eve",
        "john",
        "mary",
        "bob",
        "alice",
        "charlie",
        "zoe",
        "fred",
      ].sort(),
    );
    expect(sub.families).toHaveProperty("f1");
    expect(sub.families).toHaveProperty("f2");
    expect(sub.families).toHaveProperty("f3");
    expect(sub.families).toHaveProperty("f4");
  });
});
