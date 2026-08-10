import type { Family, Person, TreeData } from "./types";

interface DemoArgs {
  firstName: string;
  lastName: string;
  gender: Person["gender"];
  birthDate?: string;
  deathDate?: string;
  parentFamilyId?: string;
  familyIds?: string[];
}

export function createDemoTree(): TreeData {
  const people: Record<string, Person> = {};
  const families: Record<string, Family> = {};

  const add = (args: DemoArgs): Person => {
    const person: Person = {
      id: crypto.randomUUID(),
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      birthDate: args.birthDate,
      deathDate: args.deathDate,
      parentFamilyId: args.parentFamilyId,
      familyIds: args.familyIds ?? [],
    };
    people[person.id] = person;
    return person;
  };

  const adam = add({
    firstName: "Adam",
    lastName: "Smith",
    gender: "male",
    birthDate: "1940-05-12",
  });
  const eve = add({
    firstName: "Eve",
    lastName: "Smith",
    gender: "female",
    birthDate: "1942-11-03",
  });

  const john = add({
    firstName: "John",
    lastName: "Smith",
    gender: "male",
    birthDate: "1965-02-20",
  });
  const mary = add({
    firstName: "Mary",
    lastName: "Smith",
    gender: "female",
    birthDate: "1967-07-15",
  });

  const bob = add({
    firstName: "Bob",
    lastName: "Smith",
    gender: "male",
    birthDate: "1990-08-01",
  });
  const alice = add({
    firstName: "Alice",
    lastName: "Smith",
    gender: "female",
    birthDate: "1992-03-19",
  });
  const charlie = add({
    firstName: "Charlie",
    lastName: "Smith",
    gender: "male",
    birthDate: "1995-12-25",
  });

  const david = add({
    firstName: "David",
    lastName: "Jones",
    gender: "male",
    birthDate: "1988-04-04",
  });
  const zoe = add({
    firstName: "Zoe",
    lastName: "Jones",
    gender: "female",
    birthDate: "2020-09-10",
  });

  const mark = add({
    firstName: "Mark",
    lastName: "Jones",
    gender: "male",
    birthDate: "1960-01-15",
  });

  const eveLu = add({
    firstName: "Eve",
    lastName: "Lu",
    gender: "female",
    birthDate: "1996-06-21",
  });

  const fred = add({
    firstName: "Fred",
    lastName: "Smith",
    gender: "male",
    birthDate: "2024-03-02",
  });

  addFamily(adam, eve, [john]);
  addFamily(john, mary, [bob, alice, charlie]);
  addFamily(david, alice, [zoe]);
  addFamily(charlie, eveLu, [fred]);

  const markFamily: Family = {
    id: crypto.randomUUID(),
    husbandId: mark.id,
    childrenIds: [david.id],
  };
  families[markFamily.id] = markFamily;
  mark.familyIds.push(markFamily.id);
  david.parentFamilyId = markFamily.id;

  function addFamily(
    husband: Person,
    wife: Person,
    children: Person[],
  ): Family {
    const family: Family = {
      id: crypto.randomUUID(),
      husbandId: husband.id,
      wifeId: wife.id,
      childrenIds: children.map((c) => c.id),
    };
    families[family.id] = family;
    husband.familyIds.push(family.id);
    wife.familyIds.push(family.id);
    for (const child of children) child.parentFamilyId = family.id;
    return family;
  }

  return { people, families, sourceId: zoe.id };
}
