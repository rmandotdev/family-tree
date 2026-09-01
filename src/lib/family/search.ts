import type { Person } from "./types";

export function searchPeople(people: Person[], query: string): Person[] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? people.filter((person) => {
        const first = person.firstName.toLowerCase();
        const last = person.lastName.toLowerCase();
        return (
          first.includes(q) ||
          last.includes(q) ||
          `${first} ${last}`.includes(q) ||
          `${last} ${first}`.includes(q)
        );
      })
    : people;
  return [...matches].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName);
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName);
  });
}
