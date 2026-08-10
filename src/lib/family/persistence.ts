import type { TreeDataWithSource } from "./types";

const KEY = "family-tree:v1";

export function loadTree(): TreeDataWithSource | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as TreeDataWithSource;
  } catch {
    return null;
  }
}

export function saveTree(data: TreeDataWithSource): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable, ignore
  }
}
