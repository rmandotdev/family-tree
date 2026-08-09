import type { TreeData } from "./types";

const KEY = "family-tree:v3";

export function loadTree(): TreeData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as TreeData;
  } catch {
    return null;
  }
}

export function saveTree(data: TreeData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable, ignore
  }
}
