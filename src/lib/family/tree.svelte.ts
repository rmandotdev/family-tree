import { browser } from "$app/environment";
import { createDemoTree } from "./demo";
import { loadTree, saveTree } from "./persistence";
import type { FamilyTreeState } from "./tree";
import { createFamilyTree } from "./tree";
import type { Family, Person, TreeDataWithSource } from "./types";

const people = $state<Record<string, Person>>({});
const families = $state<Record<string, Family>>({});
const selectedId = $state<{ value: string | null }>({ value: null });
const sourceId = $state<{ value: string | null }>({ value: null });

const state: FamilyTreeState = { people, families, selectedId, sourceId };

export const tree = createFamilyTree(state, () => {
  if (browser)
    saveTree({
      people: state.people,
      families: state.families,
      sourceId: state.sourceId.value,
    });
});

function resolveSourceId(data: TreeDataWithSource): string | null {
  if (data.sourceId && data.people[data.sourceId]) return data.sourceId;
  return Object.keys(data.people)[0] ?? null;
}

if (browser) {
  const saved = loadTree();
  if (saved) {
    Object.assign(people, saved.people);
    Object.assign(families, saved.families);
    sourceId.value = resolveSourceId(saved);
    tree.sanitize();
  } else {
    const demo = createDemoTree();
    Object.assign(people, demo.people);
    Object.assign(families, demo.families);
    sourceId.value = resolveSourceId(demo);
  }
}
