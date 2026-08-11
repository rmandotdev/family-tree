import { browser } from "$app/environment";
import {
  deleteTreeData,
  loadTreeData,
  loadTreeIndex,
  saveTreeData,
  saveTreeIndex,
} from "./persistence";
import { createFamilyTree } from "./tree";
import { createTreeManager } from "./tree-manager";
import type { Family, Person, TreeMeta } from "./types";

const treeMetas = $state<TreeMeta[]>([]);
const activeTreeId = $state<{ value: string | null }>({ value: null });

const people = $state<Record<string, Person>>({});
const families = $state<Record<string, Family>>({});
const sourceId = $state<{ value: string | null }>({ value: null });

export const manager = createTreeManager(
  { metas: treeMetas, activeTreeId, data: { people, families, sourceId } },
  {
    loadIndex: loadTreeIndex,
    saveIndex: saveTreeIndex,
    loadData: loadTreeData,
    saveData: saveTreeData,
    deleteData: deleteTreeData,
  },
);

export const tree = createFamilyTree({ people, families, sourceId }, () => {
  if (browser) manager.persist();
});

if (browser) {
  manager.init();
  tree.sanitize();
}
