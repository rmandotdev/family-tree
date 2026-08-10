import { browser } from "$app/environment";
import { createDemoTree } from "./demo";
import type { FamilyState } from "./family";
import { createFamily } from "./family";
import { loadTree, saveTree } from "./persistence";
import type { Family, Person } from "./types";

const people = $state<Record<string, Person>>({});
const families = $state<Record<string, Family>>({});
const selectedId = $state<{ value: string | null }>({ value: null });

const state: FamilyState = { people, families, selectedId };

export const family = createFamily(state, () => {
  if (browser) saveTree({ people: state.people, families: state.families });
});

if (browser) {
  const saved = loadTree();
  if (saved) {
    Object.assign(people, saved.people);
    Object.assign(families, saved.families);
    family.sanitize();
  } else {
    const demo = createDemoTree();
    Object.assign(people, demo.people);
    Object.assign(families, demo.families);
  }
}
