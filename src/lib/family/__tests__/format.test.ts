import { describe, expect, it } from "bun:test";
import { formatLifespan } from "../format";
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

describe("formatLifespan", () => {
  it("returns an empty string without dates", () => {
    expect(formatLifespan(person())).toBe("");
  });

  it("formats a birth date only", () => {
    expect(formatLifespan(person({ birthDate: "1940-05-12" }))).toBe(
      "b. 1940-05-12",
    );
  });

  it("formats a death date only", () => {
    expect(formatLifespan(person({ deathDate: "2000-01-01" }))).toBe(
      "d. 2000-01-01",
    );
  });

  it("formats a birth and death range", () => {
    expect(
      formatLifespan(
        person({ birthDate: "1940-05-12", deathDate: "2000-01-01" }),
      ),
    ).toBe("1940-05-12 – 2000-01-01");
  });
});
