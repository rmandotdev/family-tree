import { describe, expect, it } from "bun:test";
import type { FamilyTreeState } from "./tree";
import { createFamilyTree } from "./tree";
import type { PersonInput } from "./types";

function makeState(): FamilyTreeState {
  return {
    people: {},
    families: {},
    selectedId: { value: null },
    sourceId: { value: null },
  };
}

function input(firstName: string, gender: PersonInput["gender"]): PersonInput {
  return { firstName, lastName: "", gender };
}

function expectId(value: string | undefined): string {
  if (!value) throw new Error("expected an id");
  return value;
}

describe("createFamilyTree", () => {
  it("connects a newly added person to their spouse in a shared family", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const bob = tree.addPerson(input("Bob", "male"));
    const jane = tree.addPerson(input("Jane", "female"));

    tree.setSpouse(jane.id, bob.id);

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBe(bob.id);
    expect(fams[0].wifeId).toBe(jane.id);
    expect(state.people[bob.id].familyIds).toContain(fams[0].id);
    expect(state.people[jane.id].familyIds).toContain(fams[0].id);
    expect(tree.spouseOf(jane.id)).toBe(bob.id);
    expect(tree.spouseOf(bob.id)).toBe(jane.id);
  });

  it("reconnects a deleted spouse to the existing family and its children", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const charlie = tree.addPerson(input("Charlie", "male"));
    const eve = tree.addPerson(input("Eve Lu", "female"));
    const fred = tree.addPerson(input("Fred", "male"));
    tree.setSpouse(eve.id, charlie.id);
    tree.setParents(fred.id, eve.id, charlie.id);

    const parentFam = Object.values(state.families).find(
      (f) => f.husbandId === charlie.id && f.wifeId === eve.id,
    );
    const famId = expectId(parentFam?.id);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);

    tree.deletePerson(eve.id);
    expect(state.people[charlie.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(tree.spouseOf(charlie.id)).toBeNull();

    const eve2 = tree.addPerson(input("Eve Lu", "female"));
    tree.setSpouse(eve2.id, charlie.id);

    expect(state.families[famId].husbandId).toBe(charlie.id);
    expect(state.families[famId].wifeId).toBe(eve2.id);
    expect(state.people[eve2.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(tree.spouseOf(eve2.id)).toBe(charlie.id);
    expect(tree.spouseOf(charlie.id)).toBe(eve2.id);
  });

  it("replaces a spouse without leaving a stray family behind", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const a = tree.addPerson(input("A", "male"));
    const b = tree.addPerson(input("B", "female"));
    const c = tree.addPerson(input("C", "female"));

    tree.setSpouse(a.id, b.id);
    expect(tree.spouseOf(a.id)).toBe(b.id);

    tree.setSpouse(a.id, c.id);

    expect(tree.spouseOf(a.id)).toBe(c.id);
    expect(tree.spouseOf(c.id)).toBe(a.id);
    expect(tree.spouseOf(b.id)).toBeNull();
    expect(state.people[b.id].familyIds).toHaveLength(0);
    expect(Object.values(state.families)).toHaveLength(1);
  });

  it("keeps children attached to the couple after a spouse change", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const a = tree.addPerson(input("A", "male"));
    const b = tree.addPerson(input("B", "female"));
    const c = tree.addPerson(input("C", "female"));
    const kid = tree.addPerson(input("Kid", "unknown"));

    tree.setSpouse(a.id, b.id);
    tree.setParents(kid.id, b.id, a.id);
    const famId = expectId(state.people[kid.id].parentFamilyId);

    tree.setSpouse(a.id, c.id);

    expect(state.people[kid.id].parentFamilyId).toBe(famId);
    expect(state.families[famId].husbandId).toBe(a.id);
    expect(state.families[famId].wifeId).toBe(c.id);
    expect(state.families[famId].childrenIds).toContain(kid.id);
  });

  it("makes the first added person the tree source when the tree is empty", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const adam = tree.addPerson(input("Adam", "male"));
    expect(tree.sourceId).toBe(adam.id);

    tree.addPerson(input("Bob", "male"));
    expect(tree.sourceId).toBe(adam.id);
  });

  it("cannot delete the tree source person", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const adam = tree.addPerson(input("Adam", "male"));
    tree.setSource(adam.id);

    tree.deletePerson(adam.id);

    expect(state.people[adam.id]).toBeDefined();
  });

  it("can delete the tree source after switching the source", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const adam = tree.addPerson(input("Adam", "male"));
    const bob = tree.addPerson(input("Bob", "male"));
    tree.setSource(adam.id);

    tree.setSource(bob.id);
    tree.deletePerson(adam.id);

    expect(state.people[adam.id]).toBeUndefined();
    expect(tree.sourceId).toBe(bob.id);
  });
});
