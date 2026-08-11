import { describe, expect, it } from "bun:test";
import { branchActions, filterCollapsed } from "../filter";
import { computeSubtree } from "../subtree";
import { demoTree, ids } from "./test-helpers";

describe("filterCollapsed", () => {
  it("returns the data unchanged when nothing is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, t, new Set(), new Set());
    expect(out).toBe(t);
  });

  it("prunes descendants when a children branch is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, t, new Set(["john"]), new Set());

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
    const out = filterCollapsed(t, t, new Set(["alice"]), new Set());

    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("david");
    expect(out.people).not.toHaveProperty("zoe");
    expect(out.families).toHaveProperty("f3");
  });

  it("prunes ancestors when a parents branch is collapsed", () => {
    const t = demoTree();
    const out = filterCollapsed(t, t, new Set(), new Set(["bob"]));

    expect(ids(out)).toEqual(["bob", "david", "mark"]);
    expect(out.families).not.toHaveProperty("f1");
    expect(out.families).not.toHaveProperty("f2");
    expect(out.families).not.toHaveProperty("f3");
    expect(out.families).not.toHaveProperty("f4");
    expect(out.families).toHaveProperty("f5");
  });

  it("leaves the data unchanged when collapsing a leaf person", () => {
    const t = demoTree();
    const out = filterCollapsed(t, t, new Set(["bob"]), new Set(["mark"]));
    expect(out).toBe(t);
  });

  it("drops in-laws detached by a collapsed branch in a subtree view", () => {
    const t = demoTree();
    const mark = t.people.mark;
    const subtree = computeSubtree(t, mark.id);
    expect(ids(subtree)).toEqual(["alice", "david", "mark", "zoe"]);

    const out = filterCollapsed(subtree, t, new Set(["mark"]), new Set());

    expect(ids(out)).toEqual(["mark"]);
    expect(out.people).not.toHaveProperty("alice");
    expect(out.families).toHaveProperty("f5");
    expect(out.families).not.toHaveProperty("f3");
  });

  it("never hides the POV person when collapsing a parents branch", () => {
    const t = demoTree();
    const mark = t.people.mark;
    const subtree = computeSubtree(t, mark.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["david"]), {
      focalId: mark.id,
    });

    expect(ids(out)).toEqual(["alice", "david", "mark", "zoe"]);
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
  });

  it("collapsing a descendant's parents branch keeps the POV and the spine", () => {
    const t = demoTree();
    const mark = t.people.mark;
    const subtree = computeSubtree(t, mark.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["zoe"]), {
      focalId: mark.id,
    });

    expect(ids(out)).toEqual(["alice", "david", "mark", "zoe"]);
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
  });

  it("still hides ancestors that do not include the POV person", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const subtree = computeSubtree(t, zoe.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["john"]), {
      focalId: zoe.id,
    });

    expect(out.people).not.toHaveProperty("adam");
    expect(out.people).not.toHaveProperty("eve");
    expect(out.people).toHaveProperty("john");
    expect(out.people).toHaveProperty("mary");
    expect(out.people).toHaveProperty("zoe");
    expect(out.people).toHaveProperty("david");
    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("mark");
    expect(out.people).toHaveProperty("bob");
    expect(out.families).not.toHaveProperty("f1");
    expect(out.families).toHaveProperty("f2");
  });

  it("keeps the POV person when a children branch containing them is collapsed", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const subtree = computeSubtree(t, zoe.id);

    const out = filterCollapsed(subtree, t, new Set(["alice"]), new Set(), {
      focalId: zoe.id,
    });

    expect(out.people).toHaveProperty("zoe");
    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("david");
    expect(out.families).toHaveProperty("f3");
  });

  it("hides the whole parents branch including collaterals for the POV person", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const subtree = computeSubtree(t, zoe.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["zoe"]), {
      focalId: zoe.id,
    });

    expect(ids(out)).toEqual(["zoe"]);
    expect(out.families).toEqual({});
  });

  it("hides a parent's siblings and their families when collapsing their parents", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const subtree = computeSubtree(t, zoe.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["alice"]), {
      focalId: zoe.id,
    });

    expect(ids(out)).toEqual(["alice", "david", "mark", "zoe"]);
    expect(out.people).not.toHaveProperty("bob");
    expect(out.people).not.toHaveProperty("charlie");
    expect(out.people).not.toHaveProperty("evelu");
    expect(out.people).not.toHaveProperty("fred");
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
    expect(out.families).not.toHaveProperty("f4");
  });

  it("keeps the POV's direct family when collapsing an off-branch person's parents", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const subtree = computeSubtree(t, zoe.id);

    const out = filterCollapsed(subtree, t, new Set(), new Set(["bob"]), {
      focalId: zoe.id,
    });

    expect(ids(out)).toEqual(["alice", "bob", "david", "mark", "zoe"]);
    expect(out.people).not.toHaveProperty("charlie");
    expect(out.people).not.toHaveProperty("evelu");
    expect(out.people).not.toHaveProperty("fred");
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
    expect(out.families).not.toHaveProperty("f4");
  });

  it("does not offer parents-collapse to people connected only by the child branch", () => {
    const t = demoTree();
    const mark = t.people.mark;
    const actions = branchActions(t, mark.id);

    expect(actions.get("mark")?.canCollapseParents).toBe(false);
    expect(actions.get("david")?.canCollapseParents).toBe(false);
    expect(actions.get("alice")?.canCollapseParents).toBe(false);
    expect(actions.get("zoe")?.canCollapseParents).toBe(false);
  });

  it("offers parents-collapse to people connected via the parent branch", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const actions = branchActions(t, zoe.id);

    expect(actions.get("zoe")?.canCollapseParents).toBe(true);
    expect(actions.get("david")?.canCollapseParents).toBe(true);
    expect(actions.get("alice")?.canCollapseParents).toBe(true);
    expect(actions.get("john")?.canCollapseParents).toBe(true);
    expect(actions.get("mark")?.canCollapseParents).toBe(false);
    expect(actions.get("adam")?.canCollapseParents).toBe(false);
    expect(actions.get("eve")?.canCollapseParents).toBe(false);
  });

  it("does not offer parents-collapse to collateral relatives of the POV", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const actions = branchActions(t, zoe.id);

    expect(actions.get("bob")?.canCollapseParents).toBe(false);
    expect(actions.get("charlie")?.canCollapseParents).toBe(false);
    expect(actions.get("fred")?.canCollapseParents).toBe(false);
    expect(actions.get("evelu")?.canCollapseParents).toBe(false);
  });

  it("offers parents-collapse to the POV's partner but hides it by default", () => {
    const t = demoTree();
    const alice = t.people.alice;
    const actions = branchActions(t, alice.id);

    expect(actions.get("david")?.canCollapseParents).toBe(true);
    expect(actions.get("david")?.parentsHiddenByDefault).toBe(true);
    expect(actions.get("mark")?.canCollapseParents).toBe(false);

    const fred = t.people.fred;
    const fredActions = branchActions(t, fred.id);
    expect(fredActions.get("david")?.canCollapseParents).toBe(false);
  });

  it("expands the POV's partner parents branch on demand", () => {
    const t = demoTree();
    const alice = t.people.alice;
    const subtree = computeSubtree(t, alice.id);
    expect(ids(subtree)).not.toContain("mark");

    const out = filterCollapsed(subtree, t, new Set(), new Set(), {
      focalId: alice.id,
      expandedParents: new Set(["david"]),
    });

    expect(ids(out)).toContain("mark");
    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("david");
    expect(out.families).toHaveProperty("f5");
  });

  it("offers children-collapse only to people with children who are not POV ancestors", () => {
    const t = demoTree();
    const zoe = t.people.zoe;
    const actions = branchActions(t, zoe.id);

    expect(actions.get("zoe")?.canCollapseChildren).toBe(false);
    expect(actions.get("mark")?.canCollapseChildren).toBe(false);
    expect(actions.get("john")?.canCollapseChildren).toBe(false);
    expect(actions.get("david")?.canCollapseChildren).toBe(false);
    expect(actions.get("charlie")?.canCollapseChildren).toBe(true);
    expect(actions.get("bob")?.canCollapseChildren).toBe(false);
  });

  it("does not offer children-collapse to people connected only by the parent branch", () => {
    const t = demoTree();
    const david = t.people.david;
    const actions = branchActions(t, david.id);

    expect(actions.get("mark")?.canCollapseChildren).toBe(false);
    expect(actions.get("zoe")?.canCollapseParents).toBe(false);
    expect(actions.get("david")?.canCollapseChildren).toBe(true);
    expect(actions.get("zoe")?.canCollapseChildren).toBe(false);
  });

  it("does not hide the POV's descendants when collapsing an ancestor's children", () => {
    const t = demoTree();
    const david = t.people.david;
    const subtree = computeSubtree(t, david.id);

    const out = filterCollapsed(subtree, t, new Set(["mark"]), new Set(), {
      focalId: david.id,
    });

    expect(ids(out)).toEqual(["alice", "david", "mark", "zoe"]);
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
  });

  it("still lets the POV collapse their own children branch", () => {
    const t = demoTree();
    const david = t.people.david;
    const subtree = computeSubtree(t, david.id);

    const out = filterCollapsed(subtree, t, new Set(["david"]), new Set(), {
      focalId: david.id,
    });

    expect(ids(out)).toEqual(["alice", "david", "mark"]);
    expect(out.people).not.toHaveProperty("zoe");
    expect(out.families).toHaveProperty("f3");
    expect(out.families).toHaveProperty("f5");
  });

  it("does not hide the POV's partner and descendants when collapsing a parent-in-law's children branch", () => {
    const t = demoTree();
    const subtree = computeSubtree(t, "david");
    const out = filterCollapsed(subtree, t, new Set(["john"]), new Set(), {
      focalId: "david",
      expandedParents: new Set(["alice"]),
    });

    expect(out.people).toHaveProperty("alice");
    expect(out.people).toHaveProperty("zoe");
    expect(out.people).not.toHaveProperty("bob");
    expect(out.people).not.toHaveProperty("charlie");
  });
});
