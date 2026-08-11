import type { TreeDataWithSource, TreeMeta } from "./types";

const INDEX_KEY = "family-tree:v1:index";
const ACTIVE_KEY = "family-tree:v1:active";
const DATA_PREFIX = "family-tree:v1:tree:";

export function loadTreeIndex(): TreeMeta[] | null {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as TreeMeta[];
  } catch {
    return null;
  }
}

export function saveTreeIndex(index: TreeMeta[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // storage unavailable, ignore
  }
}

export function loadTreeData(id: string): TreeDataWithSource | null {
  try {
    const raw = localStorage.getItem(`${DATA_PREFIX}${id}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as TreeDataWithSource;
  } catch {
    return null;
  }
}

export function saveTreeData(id: string, data: TreeDataWithSource): void {
  try {
    localStorage.setItem(`${DATA_PREFIX}${id}`, JSON.stringify(data));
  } catch {
    // storage unavailable, ignore
  }
}

export function deleteTreeData(id: string): void {
  try {
    localStorage.removeItem(`${DATA_PREFIX}${id}`);
  } catch {
    // storage unavailable, ignore
  }
}

export function loadActiveTreeId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveTreeId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // storage unavailable, ignore
  }
}
