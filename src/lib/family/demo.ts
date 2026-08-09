import { newId } from "./id";
import type { Person } from "./types";

interface DemoArgs {
  firstName: string;
  lastName: string;
  gender: Person["gender"];
  birthDate?: string;
  deathDate?: string;
  parentIds?: string[];
}

export function createDemoTree(): Record<string, Person> {
  const people: Record<string, Person> = {};
  const add = (args: DemoArgs): Person => {
    const person: Person = {
      id: newId(),
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      birthDate: args.birthDate,
      deathDate: args.deathDate,
      parentIds: args.parentIds ?? [],
      spouseIds: [],
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
  adam.spouseIds.push(eve.id);
  eve.spouseIds.push(adam.id);

  const john = add({
    firstName: "John",
    lastName: "Smith",
    gender: "male",
    birthDate: "1965-02-20",
    parentIds: [adam.id, eve.id],
  });
  const mary = add({
    firstName: "Mary",
    lastName: "Smith",
    gender: "female",
    birthDate: "1967-07-15",
  });
  john.spouseIds.push(mary.id);
  mary.spouseIds.push(john.id);

  add({
    firstName: "Bob",
    lastName: "Smith",
    gender: "male",
    birthDate: "1990-08-01",
    parentIds: [john.id, mary.id],
  });
  const alice = add({
    firstName: "Alice",
    lastName: "Smith",
    gender: "female",
    birthDate: "1992-03-19",
    parentIds: [john.id, mary.id],
  });
  add({
    firstName: "Charlie",
    lastName: "Smith",
    gender: "male",
    birthDate: "1995-12-25",
    parentIds: [john.id, mary.id],
  });

  const david = add({
    firstName: "David",
    lastName: "Jones",
    gender: "male",
    birthDate: "1988-04-04",
  });
  alice.spouseIds.push(david.id);
  david.spouseIds.push(alice.id);

  add({
    firstName: "Zoe",
    lastName: "Jones",
    gender: "female",
    birthDate: "2020-09-10",
    parentIds: [alice.id, david.id],
  });

  return people;
}
