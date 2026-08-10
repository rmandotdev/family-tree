export type Gender = "male" | "female" | "unknown";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  parentFamilyId?: string;
  familyIds: string[];
}

export interface Family {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
}

export interface TreeDataWithSource {
  people: Record<string, Person>;
  families: Record<string, Family>;
  sourceId: string | null;
}

export type TreeData = Omit<TreeDataWithSource, "sourceId">;

export type PersonInput = Pick<
  Person,
  "firstName" | "lastName" | "gender" | "birthDate" | "deathDate"
>;
