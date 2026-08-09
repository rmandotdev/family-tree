import { browser } from "$app/environment";
import { createDemoTree } from "./demo";
import { newId } from "./id";
import { loadTree, saveTree } from "./persistence";
import type { Person, PersonInput } from "./types";

export const family = createFamilyStore();

function createFamilyStore() {
  const people = $state<Record<string, Person>>({});
  let selectedId = $state<string | null>(null);

  if (browser) {
    const saved = loadTree();
    if (saved) {
      Object.assign(people, saved);
    } else {
      Object.assign(people, createDemoTree());
    }
  }

  function persist() {
    if (browser) saveTree(people);
  }

  function addPerson(input: PersonInput): Person {
    const person: Person = {
      id: newId(),
      ...input,
      parentIds: [],
      spouseIds: [],
    };
    people[person.id] = person;
    selectedId = person.id;
    persist();
    return person;
  }

  function updatePerson(id: string, input: PersonInput) {
    const person = people[id];
    if (!person) return;
    person.firstName = input.firstName;
    person.lastName = input.lastName;
    person.gender = input.gender;
    person.birthDate = input.birthDate;
    person.deathDate = input.deathDate;
    persist();
  }

  function deletePerson(id: string) {
    const person = people[id];
    if (!person) return;
    for (const other of Object.values(people)) {
      other.parentIds = other.parentIds.filter((pid) => pid !== id);
      other.spouseIds = other.spouseIds.filter((pid) => pid !== id);
    }
    delete people[id];
    if (selectedId === id) selectedId = null;
    persist();
  }

  function linkParent(childId: string, parentId: string) {
    const child = people[childId];
    if (!child || childId === parentId) return;
    if (people[parentId] && !child.parentIds.includes(parentId)) {
      child.parentIds.push(parentId);
      persist();
    }
  }

  function setParents(childId: string, parentIds: string[]) {
    const child = people[childId];
    if (!child) return;
    const unique = [...new Set(parentIds.filter((id) => id !== childId))];
    const toRemove = child.parentIds.filter((id) => !unique.includes(id));
    let changed = toRemove.length > 0;
    for (const id of toRemove) {
      child.parentIds = child.parentIds.filter((pid) => pid !== id);
    }
    for (const id of unique) {
      if (linkParent(childId, id)) changed = true;
    }
    if (changed) persist();
  }

  function linkSpouse(aId: string, bId: string) {
    const a = people[aId];
    const b = people[bId];
    if (!a || !b || aId === bId) return;
    let changed = false;
    if (!a.spouseIds.includes(bId)) {
      a.spouseIds.push(bId);
      changed = true;
    }
    if (!b.spouseIds.includes(aId)) {
      b.spouseIds.push(aId);
      changed = true;
    }
    if (changed) persist();
  }

  function unlinkSpouse(aId: string, bId: string) {
    const a = people[aId];
    const b = people[bId];
    let changed = false;
    if (a?.spouseIds.includes(bId)) {
      a.spouseIds = a.spouseIds.filter((id) => id !== bId);
      changed = true;
    }
    if (b?.spouseIds.includes(aId)) {
      b.spouseIds = b.spouseIds.filter((id) => id !== aId);
      changed = true;
    }
    if (changed) persist();
  }

  function setSpouse(personId: string, spouseId: string | null) {
    const person = people[personId];
    if (!person) return;
    const current = person.spouseIds[0] ?? null;
    if (current === spouseId) return;
    if (current) unlinkSpouse(personId, current);
    if (spouseId) linkSpouse(personId, spouseId);
  }

  return {
    get people() {
      return people;
    },
    get list() {
      return Object.values(people);
    },
    get selectedId() {
      return selectedId;
    },
    get selected() {
      return selectedId ? people[selectedId] : null;
    },
    select(id: string | null) {
      selectedId = id;
    },
    addPerson,
    updatePerson,
    deletePerson,
    setParents,
    linkSpouse,
    unlinkSpouse,
    setSpouse,
  };
}
