import type { Family, Person, PersonInput } from "./types";

export interface FamilyTreeState {
  people: Record<string, Person>;
  families: Record<string, Family>;
  selectedId: { value: string | null };
  sourceId: { value: string | null };
}

export function createFamilyTree(state: FamilyTreeState, persist: () => void) {
  const { people, families } = state;

  function addPerson(input: PersonInput): Person {
    const person: Person = {
      id: crypto.randomUUID(),
      ...input,
      familyIds: [],
    };
    people[person.id] = person;
    if (state.sourceId.value === null) state.sourceId.value = person.id;
    state.selectedId.value = person.id;
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

  function parentIdsOf(id: string): string[] {
    const person = people[id];
    const fam = person?.parentFamilyId
      ? families[person.parentFamilyId]
      : undefined;
    return [fam?.husbandId, fam?.wifeId].filter(
      (parentId): parentId is string => parentId !== undefined,
    );
  }

  function childrenOf(id: string): string[] {
    const result: string[] = [];
    for (const fam of Object.values(families)) {
      if (fam.husbandId !== id && fam.wifeId !== id) continue;
      for (const childId of fam.childrenIds) {
        if (!result.includes(childId)) result.push(childId);
      }
    }
    return result;
  }

  function ancestorsOf(id: string): Set<string> {
    const result = new Set<string>();
    const stack = parentIdsOf(id);
    while (stack.length > 0) {
      const next = stack.pop();
      if (!next || result.has(next)) continue;
      result.add(next);
      stack.push(...parentIdsOf(next));
    }
    return result;
  }

  function descendantsOf(id: string): Set<string> {
    const result = new Set<string>();
    const stack = childrenOf(id);
    while (stack.length > 0) {
      const next = stack.pop();
      if (!next || result.has(next)) continue;
      result.add(next);
      stack.push(...childrenOf(next));
    }
    return result;
  }

  function relatedTo(id: string): Set<string> {
    const result = ancestorsOf(id);
    for (const descendant of descendantsOf(id)) result.add(descendant);
    return result;
  }

  function sharedFamilyOf(aId: string, bId: string): Family | undefined {
    return Object.values(families).find((fam) => {
      const parents = [fam.husbandId, fam.wifeId].filter(
        (id): id is string => id !== undefined,
      );
      return parents.includes(aId) && parents.includes(bId);
    });
  }

  function areSpouses(aId: string, bId: string): boolean {
    return sharedFamilyOf(aId, bId) !== undefined;
  }

  function spouseOf(personId: string): string | null {
    const person = people[personId];
    if (!person) return null;
    for (const fid of person.familyIds) {
      const fam = families[fid];
      if (!fam) continue;
      if (fam.husbandId === personId && fam.wifeId) return fam.wifeId;
      if (fam.wifeId === personId && fam.husbandId) return fam.husbandId;
    }
    return null;
  }

  function canBeParent(childId: string | null, parentId: string): boolean {
    if (!people[parentId]) return false;
    if (childId === null) return true;
    if (childId === parentId) return false;
    const child = people[childId];
    if (!child) return false;
    if (areSpouses(childId, parentId)) return false;
    return !descendantsOf(childId).has(parentId);
  }

  function canBeSpouse(aId: string | null, bId: string): boolean {
    if (!people[bId]) return false;
    if (aId === null) return true;
    if (aId === bId) return false;
    if (!people[aId]) return false;
    return !relatedTo(aId).has(bId);
  }

  function syncFamilyParents(familyId: string) {
    const fam = families[familyId];
    if (!fam) return;
    const parentIds = [fam.husbandId, fam.wifeId].filter(
      (id): id is string => id !== undefined,
    );
    for (const id of parentIds) {
      const person = people[id];
      if (person && !person.familyIds.includes(familyId))
        person.familyIds.push(familyId);
    }
    for (const person of Object.values(people)) {
      if (!person.familyIds.includes(familyId)) continue;
      if (parentIds.includes(person.id)) continue;
      person.familyIds = person.familyIds.filter((f) => f !== familyId);
    }
  }

  function pruneFamily(familyId: string) {
    const fam = families[familyId];
    if (!fam) return;
    if (fam.husbandId !== undefined || fam.wifeId !== undefined) return;
    for (const childId of fam.childrenIds) {
      const child = people[childId];
      if (child?.parentFamilyId === familyId) child.parentFamilyId = undefined;
    }
    delete families[familyId];
  }

  function deletePerson(id: string) {
    if (id === state.sourceId.value) return;
    const person = people[id];
    if (!person) return;

    if (person.parentFamilyId) {
      const fam = families[person.parentFamilyId];
      if (fam) {
        fam.childrenIds = fam.childrenIds.filter((cid) => cid !== id);
        pruneFamily(fam.id);
      }
    }

    for (const fid of [...person.familyIds]) {
      const fam = families[fid];
      if (!fam) continue;
      if (fam.husbandId === id) fam.husbandId = undefined;
      if (fam.wifeId === id) fam.wifeId = undefined;
      syncFamilyParents(fam.id);
      pruneFamily(fam.id);
    }

    for (const fam of Object.values(families)) {
      if (!fam.childrenIds.includes(id)) continue;
      fam.childrenIds = fam.childrenIds.filter((cid) => cid !== id);
      pruneFamily(fam.id);
    }

    delete people[id];
    if (state.selectedId.value === id) state.selectedId.value = null;
    persist();
  }

  function setParents(
    childId: string,
    motherId: string | undefined,
    fatherId: string | undefined,
  ) {
    const child = people[childId];
    if (!child) return;

    const validMother =
      motherId &&
      people[motherId]?.gender === "female" &&
      canBeParent(childId, motherId)
        ? motherId
        : undefined;
    const validFather =
      fatherId &&
      people[fatherId]?.gender === "male" &&
      canBeParent(childId, fatherId)
        ? fatherId
        : undefined;

    const current = child.parentFamilyId
      ? families[child.parentFamilyId]
      : undefined;
    if (
      current &&
      current.husbandId === validFather &&
      current.wifeId === validMother
    ) {
      return;
    }

    if (current) {
      current.childrenIds = current.childrenIds.filter(
        (cid) => cid !== childId,
      );
      child.parentFamilyId = undefined;
      pruneFamily(current.id);
    }

    if (validMother === undefined && validFather === undefined) {
      persist();
      return;
    }

    let fam = Object.values(families).find(
      (f) => f.husbandId === validFather && f.wifeId === validMother,
    );
    if (!fam) {
      fam = {
        id: crypto.randomUUID(),
        husbandId: validFather,
        wifeId: validMother,
        childrenIds: [],
      };
      families[fam.id] = fam;
    }
    if (!fam.childrenIds.includes(childId)) fam.childrenIds.push(childId);
    child.parentFamilyId = fam.id;
    syncFamilyParents(fam.id);
    persist();
  }

  function setSpouse(personId: string, spouseId: string | null) {
    const person = people[personId];
    if (!person) return;

    const valid = spouseId && canBeSpouse(personId, spouseId) ? spouseId : null;
    const current = spouseOf(personId);
    if (current === valid) return;

    if (current) {
      const fam = sharedFamilyOf(personId, current);
      if (fam) {
        if (fam.husbandId === current) fam.husbandId = undefined;
        if (fam.wifeId === current) fam.wifeId = undefined;
        syncFamilyParents(fam.id);
        pruneFamily(fam.id);
      }
    }

    if (valid) {
      let fam = person.familyIds
        .map((fid) => families[fid])
        .find(
          (f) => f && (f.husbandId === undefined || f.wifeId === undefined),
        );
      if (!fam) {
        fam = (people[valid]?.familyIds ?? [])
          .map((fid) => families[fid])
          .find(
            (f) => f && (f.husbandId === undefined || f.wifeId === undefined),
          );
      }
      if (!fam) {
        fam = {
          id: crypto.randomUUID(),
          husbandId: undefined,
          wifeId: undefined,
          childrenIds: [],
        };
        families[fam.id] = fam;
      }
      if (fam.husbandId !== personId && fam.wifeId !== personId) {
        if (fam.husbandId === undefined && fam.wifeId === undefined) {
          if (person.gender === "male") fam.husbandId = personId;
          else fam.wifeId = personId;
        } else if (fam.husbandId === undefined) {
          fam.husbandId = personId;
        } else {
          fam.wifeId = personId;
        }
      }
      if (fam.husbandId !== valid && fam.wifeId !== valid) {
        if (fam.husbandId === undefined) fam.husbandId = valid;
        else fam.wifeId = valid;
      }
      syncFamilyParents(fam.id);
    }
    persist();
  }

  function sanitize() {
    let changed = false;

    for (const fam of Object.values(families)) {
      if (fam.husbandId === fam.wifeId) {
        fam.wifeId = undefined;
        changed = true;
      }
      for (const slot of ["husbandId", "wifeId"] as const) {
        const id = fam[slot];
        if (id !== undefined && !people[id]) {
          fam[slot] = undefined;
          changed = true;
        }
      }
      const parentIds = [fam.husbandId, fam.wifeId].filter(
        (id): id is string => id !== undefined,
      );
      const children = fam.childrenIds.filter(
        (id) => people[id] !== undefined && !parentIds.includes(id),
      );
      if (children.length !== fam.childrenIds.length) {
        fam.childrenIds = children;
        changed = true;
      }
    }

    for (const person of Object.values(people)) {
      if (person.parentFamilyId) {
        const fam = families[person.parentFamilyId];
        if (!fam?.childrenIds.includes(person.id)) {
          person.parentFamilyId = undefined;
          changed = true;
        }
      }
      const marital = person.familyIds.filter((fid) => {
        const fam = families[fid];
        return (
          fam !== undefined &&
          (fam.husbandId === person.id || fam.wifeId === person.id)
        );
      });
      if (marital.length !== person.familyIds.length) {
        person.familyIds = marital;
        changed = true;
      }
    }

    if (changed) persist();
  }

  function setSource(id: string) {
    if (!people[id]) return;
    state.sourceId.value = id;
    persist();
  }

  return {
    get people() {
      return people;
    },
    get families() {
      return families;
    },
    get list() {
      return Object.values(people);
    },
    get selectedId() {
      return state.selectedId.value;
    },
    get selected() {
      return state.selectedId.value ? people[state.selectedId.value] : null;
    },
    get sourceId() {
      return state.sourceId.value;
    },
    select(id: string | null) {
      state.selectedId.value = id;
    },
    addPerson,
    updatePerson,
    deletePerson,
    setSource,
    setParents,
    setSpouse,
    sanitize,
    canBeParent,
    canBeSpouse,
    spouseOf,
  };
}
