import type { Person } from "./types";

export function formatLifespan(person: Person): string {
  const birth = person.birthDate ?? "";
  const death = person.deathDate ?? "";
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return "";
}
