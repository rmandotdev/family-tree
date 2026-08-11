import { createDemoTree } from "./demo";
import type { Family, Person, TreeDataWithSource, TreeMeta } from "./types";

interface TreeManagerData {
  people: Record<string, Person>;
  families: Record<string, Family>;
  sourceId: { value: string | null };
}

export interface TreeManagerState {
  metas: TreeMeta[];
  activeTreeId: { value: string | null };
  data: TreeManagerData;
}

export interface TreeStorage {
  loadIndex(): TreeMeta[] | null;
  saveIndex(metas: TreeMeta[]): void;
  loadData(id: string): TreeDataWithSource | null;
  saveData(id: string, data: TreeDataWithSource): void;
  deleteData(id: string): void;
}

export function createTreeManager(
  state: TreeManagerState,
  storage: TreeStorage,
) {
  const { metas, activeTreeId, data } = state;

  function resolveSourceId(tree: TreeDataWithSource): string | null {
    if (tree.sourceId && tree.people[tree.sourceId]) return tree.sourceId;
    return Object.keys(tree.people)[0] ?? null;
  }

  function swapData(next: TreeDataWithSource) {
    for (const key of Object.keys(data.people)) {
      if (!(key in next.people)) delete data.people[key];
    }
    for (const key of Object.keys(data.families)) {
      if (!(key in next.families)) delete data.families[key];
    }
    Object.assign(data.people, next.people);
    Object.assign(data.families, next.families);
    data.sourceId.value = resolveSourceId(next);
  }

  function loadData(id: string): TreeDataWithSource {
    return storage.loadData(id) ?? { people: {}, families: {}, sourceId: null };
  }

  function persist() {
    if (activeTreeId.value === null) return;
    storage.saveData(activeTreeId.value, {
      people: data.people,
      families: data.families,
      sourceId: data.sourceId.value,
    });
  }

  function switchTree(id: string) {
    if (id === activeTreeId.value) return;
    activeTreeId.value = id;
    swapData(loadData(id));
  }

  function createTree(name: string): string {
    const id = crypto.randomUUID();
    metas.push({ id, name, createdAt: Date.now() });
    storage.saveIndex(metas);
    activeTreeId.value = id;
    swapData({ people: {}, families: {}, sourceId: null });
    return id;
  }

  function renameTree(id: string, name: string) {
    const meta = metas.find((t) => t.id === id);
    if (!meta) return;
    meta.name = name;
    storage.saveIndex(metas);
  }

  function deleteTree(id: string) {
    const idx = metas.findIndex((t) => t.id === id);
    if (idx === -1) return;
    if (metas.length <= 1) return;
    metas.splice(idx, 1);
    storage.saveIndex(metas);
    storage.deleteData(id);
    if (activeTreeId.value === id) {
      const next = metas[0]?.id ?? null;
      activeTreeId.value = next;
      swapData(
        next === null
          ? { people: {}, families: {}, sourceId: null }
          : loadData(next),
      );
    }
  }

  function init() {
    const index = storage.loadIndex();
    if (index && index.length > 0) {
      metas.push(...index);
      activeTreeId.value = index[0].id;
    } else {
      const id = crypto.randomUUID();
      const demo = createDemoTree();
      metas.push({ id, name: "My family", createdAt: Date.now() });
      storage.saveData(id, demo);
      storage.saveIndex(metas);
      activeTreeId.value = id;
    }
    const activeId = activeTreeId.value;
    if (activeId !== null) swapData(loadData(activeId));
  }

  return {
    get metas() {
      return metas;
    },
    get activeTreeId() {
      return activeTreeId.value;
    },
    init,
    persist,
    switchTree,
    createTree,
    renameTree,
    deleteTree,
  };
}
