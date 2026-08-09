export type Gender = "male" | "female" | "other";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  parentIds: string[];
  spouseIds: string[];
}

export type PersonInput = Pick<
  Person,
  "firstName" | "lastName" | "gender" | "birthDate" | "deathDate"
>;
