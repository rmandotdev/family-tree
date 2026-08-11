import type { Family, Gender, Person, TreeData } from "./types";

export function person(id: string, gender: Gender = "unknown"): Person {
  return { id, firstName: id, lastName: "", gender, familyIds: [] };
}

export function family(
  id: string,
  husband?: string,
  wife?: string,
  children: string[] = [],
): Family {
  return { id, husbandId: husband, wifeId: wife, childrenIds: children };
}

export function tree(people: Person[], families: Family[]): TreeData {
  return {
    people: Object.fromEntries(people.map((p) => [p.id, p])),
    families: Object.fromEntries(families.map((f) => [f.id, f])),
  };
}

export function ids(data: TreeData): string[] {
  return Object.keys(data.people).sort();
}

export function demoTree(): TreeData {
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
