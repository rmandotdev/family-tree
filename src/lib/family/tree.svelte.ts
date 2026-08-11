import { browser } from "$app/environment";
import {
  deleteTreeData,
  loadActiveTreeId,
  loadTreeData,
  loadTreeIndex,
  saveActiveTreeId,
  saveTreeData,
  saveTreeIndex,
} from "./persistence";
import { createFamilyTree } from "./tree";
import type { TreeManagerState } from "./tree-manager";
import { createTreeManager } from "./tree-manager";

const state = $state<TreeManagerState>({
  metas: [],
  activeTreeId: { value: null },
  data: { people: {}, families: {}, sourceId: { value: null } },
});

export const manager = createTreeManager(state, {
  loadIndex: loadTreeIndex,
  saveIndex: saveTreeIndex,
  loadData: loadTreeData,
  saveData: saveTreeData,
  deleteData: deleteTreeData,
  loadActiveId: loadActiveTreeId,
  saveActiveId: saveActiveTreeId,
});

export const tree = createFamilyTree(state.data, () => {
  if (browser) manager.persist();
});

if (browser) {
  manager.init();
  tree.sanitize();
}
