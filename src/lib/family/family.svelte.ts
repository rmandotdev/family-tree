import { browser } from "$app/environment";
import { createDemoTree } from "./demo";
import type { FamilyState } from "./family";
import { createFamily } from "./family";
import { loadTree, saveTree } from "./persistence";
import type { Family, Person, TreeData } from "./types";

const people = $state<Record<string, Person>>({});
const families = $state<Record<string, Family>>({});
const selectedId = $state<{ value: string | null }>({ value: null });
const sourceId = $state<{ value: string | null }>({ value: null });

const state: FamilyState = { people, families, selectedId, sourceId };

export const family = createFamily(state, () => {
  if (browser)
    saveTree({
      people: state.people,
      families: state.families,
      sourceId: state.sourceId.value,
    });
});

function resolveSourceId(data: TreeData): string | null {
  if (data.sourceId && data.people[data.sourceId]) return data.sourceId;
  return Object.keys(data.people)[0] ?? null;
}

if (browser) {
  const saved = loadTree();
  if (saved) {
    Object.assign(people, saved.people);
    Object.assign(families, saved.families);
    sourceId.value = resolveSourceId(saved);
    family.sanitize();
  } else {
    const demo = createDemoTree();
    Object.assign(people, demo.people);
    Object.assign(families, demo.families);
    sourceId.value = resolveSourceId(demo);
  }
}
