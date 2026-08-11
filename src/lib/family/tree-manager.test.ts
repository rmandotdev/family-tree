import { describe, expect, it } from "bun:test";
import type { TreeManagerState, TreeStorage } from "./tree-manager";
import { createTreeManager } from "./tree-manager";
import type { Person, TreeDataWithSource, TreeMeta } from "./types";

function makeState(): TreeManagerState {
  return {
    metas: [],
    activeTreeId: { value: null },
    data: { people: {}, families: {}, sourceId: { value: null } },
  };
}

interface MemoryStorage extends TreeStorage {
  index: TreeMeta[] | null;
  data: Map<string, TreeDataWithSource>;
}

function makeStorage(): MemoryStorage {
  let index: TreeMeta[] | null = null;
  const data = new Map<string, TreeDataWithSource>();
  return {
    get index() {
      return index;
    },
    data,
    loadIndex: () => (index === null ? null : structuredClone(index)),
    saveIndex: (metas) => {
      index = structuredClone(metas);
    },
    loadData: (id) => {
      const saved = data.get(id);
      return saved ? structuredClone(saved) : null;
    },
    saveData: (id, tree) => data.set(id, structuredClone(tree)),
    deleteData: (id) => data.delete(id),
  };
}

function person(
  id: string,
  firstName: string,
  gender: Person["gender"],
): Person {
  return { id, firstName, lastName: "", gender, familyIds: [] };
}

function seedTree(
  storage: MemoryStorage,
  meta: TreeMeta,
  people: Record<string, Person> = {},
  sourceId: string | null = null,
): TreeDataWithSource {
  const tree: TreeDataWithSource = { people, families: {}, sourceId };
  storage.saveIndex([meta]);
  storage.saveData(meta.id, tree);
  return tree;
}

describe("createTreeManager", () => {
  it("initializes with the first indexed tree and loads its data", () => {
    const storage = makeStorage();
    const alice = person("p1", "Alice", "female");
    seedTree(
      storage,
      { id: "t1", name: "First", createdAt: 1 },
      { p1: alice },
      "p1",
    );

    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();

    expect(manager.activeTreeId).toBe("t1");
    expect(manager.metas).toHaveLength(1);
    expect(state.data.people.p1?.firstName).toBe("Alice");
    expect(state.data.sourceId.value).toBe("p1");
  });

  it("creates a seeded demo tree when no index exists", () => {
    const storage = makeStorage();
    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();

    expect(manager.activeTreeId).not.toBeNull();
    expect(manager.metas).toHaveLength(1);
    expect(manager.metas[0].name).toBe("Demo Tree");
    expect(Object.keys(state.data.people).length).toBeGreaterThan(0);
    expect(storage.index).toHaveLength(1);
    expect(storage.data.size).toBe(1);
  });

  it("creates an empty tree, switches to it and persists the index", () => {
    const storage = makeStorage();
    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();
    const firstId = manager.activeTreeId;
    expect(firstId).not.toBeNull();

    const id = manager.createTree("Vacation");

    expect(id).not.toBe(firstId);
    expect(manager.activeTreeId).toBe(id);
    expect(manager.metas).toHaveLength(2);
    expect(manager.metas[1].name).toBe("Vacation");
    expect(Object.keys(state.data.people)).toHaveLength(0);
    expect(storage.index).toHaveLength(2);
  });

  it("renames a tree and persists the new name", () => {
    const storage = makeStorage();
    const manager = createTreeManager(makeState(), storage);
    manager.init();
    const id = manager.createTree("Vacation");

    manager.renameTree(id, "Holidays");

    expect(manager.metas.find((t) => t.id === id)?.name).toBe("Holidays");
    expect(storage.index?.find((t) => t.id === id)?.name).toBe("Holidays");
  });

  it("deletes a non-active tree from the index and storage", () => {
    const storage = makeStorage();
    const manager = createTreeManager(makeState(), storage);
    manager.init();
    const a = manager.createTree("A");
    const b = manager.createTree("B");

    manager.deleteTree(a);

    expect(manager.metas.find((t) => t.id === a)).toBeUndefined();
    expect(storage.data.has(a)).toBe(false);
    expect(storage.index?.some((t) => t.id === a)).toBe(false);
    expect(manager.activeTreeId).toBe(b);
  });

  it("switches to the next tree when deleting the active tree", () => {
    const storage = makeStorage();
    const manager = createTreeManager(makeState(), storage);
    const a = manager.createTree("A");
    const b = manager.createTree("B");
    manager.switchTree(a);

    manager.deleteTree(a);

    expect(manager.activeTreeId).toBe(b);
  });

  it("does not delete the last remaining tree", () => {
    const storage = makeStorage();
    const state = makeState();
    const manager = createTreeManager(state, storage);
    const a = manager.createTree("A");
    state.data.people.p1 = person("p1", "Alice", "female");
    manager.persist();

    manager.deleteTree(a);

    expect(manager.activeTreeId).toBe(a);
    expect(manager.metas).toHaveLength(1);
    expect(storage.index).toHaveLength(1);
    expect(storage.data.has(a)).toBe(true);
  });

  it("switches trees and swaps in the target tree's data", () => {
    const storage = makeStorage();
    const alice = person("p1", "Alice", "female");
    seedTree(
      storage,
      { id: "t1", name: "First", createdAt: 1 },
      { p1: alice },
      "p1",
    );

    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();
    manager.createTree("Second");

    manager.switchTree("t1");

    expect(manager.activeTreeId).toBe("t1");
    expect(state.data.people.p1?.firstName).toBe("Alice");
    expect(state.data.sourceId.value).toBe("p1");
  });

  it("resolves an invalid stored source id to the first person", () => {
    const storage = makeStorage();
    const alice = person("p1", "Alice", "female");
    seedTree(
      storage,
      { id: "t1", name: "First", createdAt: 1 },
      { p1: alice },
      "ghost",
    );

    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();
    manager.switchTree("t1");

    expect(state.data.sourceId.value).toBe("p1");
  });

  it("is a no-op when switching to the already active tree", () => {
    const storage = makeStorage();
    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();
    const id = manager.createTree("A");

    manager.switchTree(id);

    expect(manager.activeTreeId).toBe(id);
    expect(Object.keys(state.data.people)).toHaveLength(0);
  });

  it("persists the current data of the active tree", () => {
    const storage = makeStorage();
    const state = makeState();
    const manager = createTreeManager(state, storage);
    manager.init();
    const id = manager.activeTreeId;
    expect(id).not.toBeNull();

    const bob = person("p2", "Bob", "male");
    state.data.people.p2 = bob;
    state.data.sourceId.value = "p2";
    manager.persist();

    const saved = storage.data.get(id as string);
    expect(saved?.people.p2?.firstName).toBe("Bob");
    expect(saved?.sourceId).toBe("p2");
  });
});
