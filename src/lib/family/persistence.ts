import type { Person } from "./types";

const KEY = "family-tree:v1";

export function loadTree(): Record<string, Person> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Record<string, Person>;
  } catch {
    return null;
  }
}

export function saveTree(people: Record<string, Person>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(people));
  } catch {
    // storage unavailable, ignore
  }
}
