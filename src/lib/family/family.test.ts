import { describe, expect, it } from "bun:test";
import type { FamilyState } from "./family";
import { createFamily } from "./family";
import type { PersonInput } from "./types";

function makeState(): FamilyState {
  return { people: {}, families: {}, selectedId: { value: null } };
}

function input(firstName: string, gender: PersonInput["gender"]): PersonInput {
  return { firstName, lastName: "", gender };
}

function expectId(value: string | undefined): string {
  if (!value) throw new Error("expected an id");
  return value;
}

describe("createFamily", () => {
  it("connects a newly added person to their spouse in a shared family", () => {
    const state = makeState();
    const core = createFamily(state, () => {});
    const bob = core.addPerson(input("Bob", "male"));
    const jane = core.addPerson(input("Jane", "female"));

    core.setSpouse(jane.id, bob.id);

    const fams = Object.values(state.families);
    expect(fams).toHaveLength(1);
    expect(fams[0].husbandId).toBe(bob.id);
    expect(fams[0].wifeId).toBe(jane.id);
    expect(state.people[bob.id].familyIds).toContain(fams[0].id);
    expect(state.people[jane.id].familyIds).toContain(fams[0].id);
    expect(core.spouseOf(jane.id)).toBe(bob.id);
    expect(core.spouseOf(bob.id)).toBe(jane.id);
  });

  it("reconnects a deleted spouse to the existing family and its children", () => {
    const state = makeState();
    const core = createFamily(state, () => {});
    const charlie = core.addPerson(input("Charlie", "male"));
    const eve = core.addPerson(input("Eve Lu", "female"));
    const fred = core.addPerson(input("Fred", "male"));
    core.setSpouse(eve.id, charlie.id);
    core.setParents(fred.id, eve.id, charlie.id);

    const parentFam = Object.values(state.families).find(
      (f) => f.husbandId === charlie.id && f.wifeId === eve.id,
    );
    const famId = expectId(parentFam?.id);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);

    core.deletePerson(eve.id);
    expect(state.people[charlie.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(core.spouseOf(charlie.id)).toBeNull();

    const eve2 = core.addPerson(input("Eve Lu", "female"));
    core.setSpouse(eve2.id, charlie.id);

    expect(state.families[famId].husbandId).toBe(charlie.id);
    expect(state.families[famId].wifeId).toBe(eve2.id);
    expect(state.people[eve2.id].familyIds).toContain(famId);
    expect(state.people[fred.id].parentFamilyId).toBe(famId);
    expect(core.spouseOf(eve2.id)).toBe(charlie.id);
    expect(core.spouseOf(charlie.id)).toBe(eve2.id);
  });

  it("replaces a spouse without leaving a stray family behind", () => {
    const state = makeState();
    const core = createFamily(state, () => {});
    const a = core.addPerson(input("A", "male"));
    const b = core.addPerson(input("B", "female"));
    const c = core.addPerson(input("C", "female"));

    core.setSpouse(a.id, b.id);
    expect(core.spouseOf(a.id)).toBe(b.id);

    core.setSpouse(a.id, c.id);

    expect(core.spouseOf(a.id)).toBe(c.id);
    expect(core.spouseOf(c.id)).toBe(a.id);
    expect(core.spouseOf(b.id)).toBeNull();
    expect(state.people[b.id].familyIds).toHaveLength(0);
    expect(Object.values(state.families)).toHaveLength(1);
  });

  it("keeps children attached to the couple after a spouse change", () => {
    const state = makeState();
    const core = createFamily(state, () => {});
    const a = core.addPerson(input("A", "male"));
    const b = core.addPerson(input("B", "female"));
    const c = core.addPerson(input("C", "female"));
    const kid = core.addPerson(input("Kid", "unknown"));

    core.setSpouse(a.id, b.id);
    core.setParents(kid.id, b.id, a.id);
    const famId = expectId(state.people[kid.id].parentFamilyId);

    core.setSpouse(a.id, c.id);

    expect(state.people[kid.id].parentFamilyId).toBe(famId);
    expect(state.families[famId].husbandId).toBe(a.id);
    expect(state.families[famId].wifeId).toBe(c.id);
    expect(state.families[famId].childrenIds).toContain(kid.id);
  });
});
