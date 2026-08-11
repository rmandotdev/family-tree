import { describe, expect, it } from "bun:test";
import type { FamilyTreeState } from "./tree";
import { createFamilyTree } from "./tree";
import type { PersonInput } from "./types";

function makeState(): FamilyTreeState {
  return { people: {}, families: {}, sourceId: { value: null } };
}

function input(firstName: string, gender: PersonInput["gender"]): PersonInput {
  return { firstName, lastName: "", gender };
}

function expectId(value: string | undefined): string {
  if (!value) throw new Error("expected an id");
  return value;
}

describe("createFamilyTree", () => {
  it("connects a newly added person to their partner in a shared family", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const bob = tree.addPerson(input("Bob", "male"));
    const jane = tree.addPerson(input("Jane", "female"));

    tree.setPartner(jane.id, bob.id);

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBe(bob.id);
    expect(fams[0].wifeId).toBe(jane.id);
    expect(state.people[bob.id].familyIds).toContain(fams[0].id);
    expect(state.people[jane.id].familyIds).toContain(fams[0].id);
    expect(tree.partnerOf(jane.id)).toBe(bob.id);
    expect(tree.partnerOf(bob.id)).toBe(jane.id);
  });

  it("reconnects a deleted partner to the existing family and its children", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const charlie = tree.addPerson(input("Charlie", "male"));
    const eve = tree.addPerson(input("Eve Lu", "female"));
    const fred = tree.addPerson(input("Fred", "male"));
    tree.setPartner(eve.id, charlie.id);
    tree.setParents(fred.id, eve.id, charlie.id);

    const parentFam = Object.values(state.families).find(
      (f) => f.husbandId === charlie.id && f.wifeId === eve.id,
    );
    const famId = expectId(parentFam?.id);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);

    tree.deletePerson(eve.id);
    expect(state.people[charlie.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(tree.partnerOf(charlie.id)).toBeNull();

    const eve2 = tree.addPerson(input("Eve Lu", "female"));
    tree.setPartner(eve2.id, charlie.id);

    expect(state.families[famId].husbandId).toBe(charlie.id);
    expect(state.families[famId].wifeId).toBe(eve2.id);
    expect(state.people[eve2.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(tree.partnerOf(eve2.id)).toBe(charlie.id);
    expect(tree.partnerOf(charlie.id)).toBe(eve2.id);
  });

  it("replaces a partner without leaving a stray family behind", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const a = tree.addPerson(input("A", "male"));
    const b = tree.addPerson(input("B", "female"));
    const c = tree.addPerson(input("C", "female"));

    tree.setPartner(a.id, b.id);
    expect(tree.partnerOf(a.id)).toBe(b.id);

    tree.setPartner(a.id, c.id);

    expect(tree.partnerOf(a.id)).toBe(c.id);
    expect(tree.partnerOf(c.id)).toBe(a.id);
    expect(tree.partnerOf(b.id)).toBeNull();
    expect(state.people[b.id].familyIds).toHaveLength(0);
    expect(Object.values(state.families)).toHaveLength(1);
  });

  it("keeps children attached to the couple after a partner change", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const a = tree.addPerson(input("A", "male"));
    const b = tree.addPerson(input("B", "female"));
    const c = tree.addPerson(input("C", "female"));
    const kid = tree.addPerson(input("Kid", "unknown"));

    tree.setPartner(a.id, b.id);
    tree.setParents(kid.id, b.id, a.id);
    const famId = expectId(state.people[kid.id].parentFamilyId);

    tree.setPartner(a.id, c.id);

    expect(state.people[kid.id].parentFamilyId).toBe(famId);
    expect(state.families[famId].husbandId).toBe(a.id);
    expect(state.families[famId].wifeId).toBe(c.id);
    expect(state.families[famId].childrenIds).toContain(kid.id);
  });

  it("reuses the current family when adding the other parent to a child", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const mary = tree.addPerson(input("Mary", "female"));
    const mother = tree.addPerson(input("Mother", "female"));
    const father = tree.addPerson(input("Father", "male"));

    tree.setParents(mary.id, mother.id, undefined);
    expect(Object.values(state.families)).toHaveLength(1);

    tree.setParents(mary.id, mother.id, father.id);

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBe(father.id);
    expect(fams[0].wifeId).toBe(mother.id);
    expect(fams[0].childrenIds).toContain(mary.id);
    expect(state.people[mary.id].parentFamilyId).toBe(fams[0].id);
    expect(state.people[father.id].familyIds).toContain(fams[0].id);
    expect(state.people[mother.id].familyIds).toContain(fams[0].id);
  });

  it("links a sibling to a parentless person through a shared family", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const alice = tree.addPerson(input("Alice", "female"));

    const bob = tree.addSibling(alice.id, input("Bob", "male"));

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBeUndefined();
    expect(fams[0].wifeId).toBeUndefined();
    expect(fams[0].childrenIds).toEqual([alice.id, bob.id]);
    expect(state.people[alice.id].parentFamilyId).toBe(fams[0].id);
    expect(state.people[bob.id].parentFamilyId).toBe(fams[0].id);
  });

  it("adds a sibling to the existing parent family when the person has parents", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const alice = tree.addPerson(input("Alice", "female"));
    const father = tree.addPerson(input("Father", "male"));
    tree.setParents(alice.id, undefined, father.id);
    const parentFamId = expectId(state.people[alice.id].parentFamilyId);

    const bob = tree.addSibling(alice.id, input("Bob", "male"));

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(state.families[parentFamId].childrenIds).toEqual([alice.id, bob.id]);
  });

  it("wires both siblings to a parent added after the fact", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const alice = tree.addPerson(input("Alice", "female"));
    const bob = tree.addSibling(alice.id, input("Bob", "male"));
    const father = tree.addPerson(input("Father", "male"));

    tree.setParents(alice.id, undefined, father.id);

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBe(father.id);
    expect(fams[0].wifeId).toBeUndefined();
    expect(fams[0].childrenIds).toEqual([alice.id, bob.id]);
    expect(state.people[bob.id].parentFamilyId).toBe(fams[0].id);
  });

  it("keeps the remaining sibling when one sibling is deleted", () => {
    const state = makeState();
    const tree = createFamilyTree(state, () => {});
    const alice = tree.addPerson(input("Alice", "female"));
    const bob = tree.addSibling(alice.id, input("Bob", "male"));
    const famId = expectId(state.people[bob.id].parentFamilyId);

    tree.deletePerson(bob.id);

    expect(state.families[famId]).toBeDefined();
    expect(state.families[famId].childrenIds).toEqual([alice.id]);
    expect(state.people[alice.id].parentFamilyId).toBe(famId);
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
