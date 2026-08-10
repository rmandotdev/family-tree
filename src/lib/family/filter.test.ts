import { describe, expect, it } from "bun:test";
import { filterCollapsed } from "./filter";
import { computeSubtree } from "./subtree";
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

function ids(data: TreeData): string[] {
  return Object.keys(data.people).sort();
}

function demoTree(): TreeData {
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
  return tree(
    [adam, eve, john, mary, bob, alice, charlie, david, zoe, mark, eveLu, fred],
    [
      family("f1", adam.id, eve.id, [john.id]),
      family("f2", john.id, mary.id, [bob.id, alice.id, charlie.id]),
      family("f3", david.id, alice.id, [zoe.id]),
      family("f4", charlie.id, eveLu.id, [fred.id]),
      family("f5", mark.id, undefined, [david.id]),
    ],
  );
}

describe("filterCollapsed", () => {
  it("returns the data unchanged when nothing is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, new Set(), new Set());
    expect(out).toBe(t);
  });

  it("prunes descendants when a children branch is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, new Set(["john"]), new Set());

    expect(ids(out)).toEqual(
      ["adam", "david", "eve", "john", "mark", "mary"].sort(),
    );
    expect(out.families).toHaveProperty("f1");
    expect(out.families).toHaveProperty("f2");
    expect(out.families).not.toHaveProperty("f3");
    expect(out.families).not.toHaveProperty("f4");
    expect(out.families).toHaveProperty("f5");
  });

  it("keeps the collapsed person's own couple but not its children", () => {
    const t = demoTree();
    const out = filterCollapsed(t, new Set(["alice"]), new Set());

    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("david");
    expect(out.people).not.toHaveProperty("zoe");
    expect(out.families).toHaveProperty("f3");
  });

  it("prunes ancestors when a parents branch is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, new Set(), new Set(["bob"]));

    expect(ids(out)).toEqual(
      [
        "bob",
        "alice",
        "charlie",
        "david",
        "zoe",
        "mark",
        "evelu",
        "fred",
      ].sort(),
    );
    expect(out.families).not.toHaveProperty("f1");
    expect(out.families).not.toHaveProperty("f2");
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f4");
    expect(out.families).toHaveProperty("f5");
  });

  it("leaves the data unchanged when collapsing a leaf person", () => {
    const t = demoTree();
    const out = filterCollapsed(t, new Set(["bob"]), new Set(["mark"]));
    expect(out).toBe(t);
  });

  it("drops in-laws detached by a collapsed branch in a subtree view", () => {
    const t = demoTree();
    const mark = t.people.mark;
    const subtree = computeSubtree(t, mark.id);
    expect(ids(subtree)).toEqual(["alice", "david", "mark", "zoe"]);

    const out = filterCollapsed(subtree, new Set(["mark"]), new Set());

    expect(ids(out)).toEqual(["mark"]);
    expect(out.people).not.toHaveProperty("alice");
    expect(out.families).toHaveProperty("f5");
    expect(out.families).not.toHaveProperty("f3");
  });
});
