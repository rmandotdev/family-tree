import { describe, expect, it } from "bun:test";
import { searchPeople } from "../search";
import type { Person } from "../types";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "a",
    firstName: "Adam",
    lastName: "",
    gender: "male",
    familyIds: [],
    ...overrides,
  };
}

const people = [
  person({ id: "c", firstName: "Carol", lastName: "Smith" }),
  person({ id: "a", firstName: "Adam", lastName: "Jones" }),
  person({ id: "b", firstName: "Anna", lastName: "Smith" }),
  person({ id: "d", firstName: "John", lastName: "Doe" }),
];

describe("searchPeople", () => {
  it("returns everyone sorted by last name when the query is empty", () => {
    expect(searchPeople(people, "").map((p) => p.id)).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
  });

  it("matches names case-insensitively", () => {
    expect(searchPeople(people, "ANNA").map((p) => p.id)).toEqual(["b"]);
  });

  it("matches by first name", () => {
    expect(searchPeople(people, "adam").map((p) => p.id)).toEqual(["a"]);
  });

  it("matches by last name", () => {
    expect(searchPeople(people, "smith").map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("matches an unordered full name", () => {
    expect(searchPeople(people, "jones adam").map((p) => p.id)).toEqual(["a"]);
  });

  it("ignores surrounding whitespace", () => {
    expect(searchPeople(people, "  doe  ").map((p) => p.id)).toEqual(["d"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchPeople(people, "xyz")).toEqual([]);
  });
});
