<script lang="ts">
import { family } from "$lib/family/family.svelte";
import { filterCollapsed } from "$lib/family/filter";
import { computeLayout } from "$lib/family/layout";
import { computeSubtree } from "$lib/family/subtree";
import type { Gender } from "$lib/family/types";
import ConnectionLines from "./ConnectionLines.svelte";
import FamilyCanvas from "./FamilyCanvas.svelte";
import type { CardAction } from "./PersonCard.svelte";
import PersonCard from "./PersonCard.svelte";
import PersonEditor from "./PersonEditor.svelte";
import { canvas } from "./pan.svelte";

let pov = $state<{ focalId: string } | null>(null);
let collapsedChildren = $state<Set<string>>(new Set());
let collapsedParents = $state<Set<string>>(new Set());
let openMenuId = $state<string | null>(null);
let recenterKey = $state(0);
let editing = $state<{ id: string | null } | null>(null);
let addRelativePreset = $state<{
  spouseId?: string;
  motherId?: string;
  fatherId?: string;
  gender?: Gender;
  parentOf?: string;
} | null>(null);

const fullData = $derived({ people: family.people, families: family.families });
const subtreeData = $derived(
  pov ? computeSubtree(fullData, pov.focalId) : fullData,
);
const viewData = $derived(
  filterCollapsed(subtreeData, collapsedChildren, collapsedParents),
);
const layout = $derived(computeLayout(viewData));
const visibleList = $derived(Object.values(viewData.people));
const focal = $derived(pov ? (family.people[pov.focalId] ?? null) : null);
const selected = $derived(family.selected);

function toggleMenu(id: string) {
  if (canvas.isPanning) return;
  family.select(id);
  openMenuId = openMenuId === id ? null : id;
}

$effect(() => {
  if (openMenuId === null) return;
  const close = (e: PointerEvent) => {
    if (e.target instanceof Element && e.target.closest("[data-card]")) return;
    openMenuId = null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") openMenuId = null;
  };
  document.addEventListener("pointerdown", close);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("pointerdown", close);
    document.removeEventListener("keydown", onKey);
  };
});

function openEditor(id: string | null) {
  addRelativePreset = null;
  editing = { id };
}

function openAddRelative(
  id: string,
  relation: "child" | "spouse" | "sibling" | "mother" | "father",
) {
  const person = family.people[id];
  if (!person) return;
  let preset: typeof addRelativePreset = null;
  if (relation === "spouse") {
    preset = { spouseId: id, gender: oppositeGender(person.gender) };
  } else if (relation === "child") {
    const spouseId = family.spouseOf(id);
    const spouse = spouseId ? family.people[spouseId] : undefined;
    const motherId =
      person.gender === "female"
        ? id
        : spouse?.gender === "female"
          ? spouse.id
          : undefined;
    const fatherId =
      person.gender === "male"
        ? id
        : spouse?.gender === "male"
          ? spouse.id
          : undefined;
    preset = { motherId, fatherId };
  } else if (relation === "sibling") {
    const fam = person.parentFamilyId
      ? family.families[person.parentFamilyId]
      : undefined;
    preset = { motherId: fam?.wifeId, fatherId: fam?.husbandId };
  } else {
    preset = {
      parentOf: id,
      gender: relation === "mother" ? "female" : "male",
    };
  }
  addRelativePreset = preset;
  editing = { id: null };
}

function oppositeGender(gender: Gender): Gender | undefined {
  if (gender === "male") return "female";
  if (gender === "female") return "male";
  return undefined;
}

function handleAction(personId: string, action: CardAction) {
  openMenuId = null;
  switch (action) {
    case "edit":
      openEditor(personId);
      break;
    case "focus":
      pov = { focalId: personId };
      family.select(personId);
      recenterKey += 1;
      break;
    case "addChild":
      openAddRelative(personId, "child");
      break;
    case "addSpouse":
      openAddRelative(personId, "spouse");
      break;
    case "addSibling":
      openAddRelative(personId, "sibling");
      break;
    case "addMother":
      openAddRelative(personId, "mother");
      break;
    case "addFather":
      openAddRelative(personId, "father");
      break;
    case "toggleChildren":
      collapsedChildren = toggleSet(collapsedChildren, personId);
      break;
    case "toggleParents":
      collapsedParents = toggleSet(collapsedParents, personId);
      break;
  }
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function exitPov() {
  pov = null;
  recenterKey += 1;
}
</script>

<div class="relative h-full w-full overflow-hidden bg-stone-100">
  <FamilyCanvas
    contentWidth={layout.width}
    contentHeight={layout.height}
    {recenterKey}
  >
    {#if visibleList.length > 0}
      <svg
        class="absolute left-0 top-0"
        style:width="{layout.width}px"
        style:height="{layout.height}px"
        style:pointer-events="none"
      >
        <title>Family tree relationships</title>
        <ConnectionLines
          positions={layout.positions}
          couples={layout.couples}
        />
      </svg>

      {#each visibleList as person (person.id)}
        {@const fam = person.parentFamilyId ? family.families[person.parentFamilyId] : undefined}
        {@const pos = layout.positions.get(person.id)}
        {#if pos}
          <PersonCard
            {person}
            x={pos.x}
            y={pos.y}
            selected={family.selectedId === person.id}
            menuOpen={openMenuId === person.id}
            childrenCollapsed={collapsedChildren.has(person.id)}
            parentsCollapsed={collapsedParents.has(person.id)}
            motherMissing={fam?.wifeId === undefined}
            fatherMissing={fam?.husbandId === undefined}
            onToggleMenu={() => toggleMenu(person.id)}
            onAction={(action) => handleAction(person.id, action)}
          />
        {/if}
      {/each}
    {:else}
      <p
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-400"
      >
        Add your first family member to get started.
      </p>
    {/if}
  </FamilyCanvas>

  <div class="absolute left-4 top-4 flex items-center gap-2">
    <button
      class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-stone-700"
      type="button"
      onclick={() => openEditor(null)}
    >
      + Add person
    </button>
    {#if selected}
      <button
        class="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow hover:bg-stone-50"
        type="button"
        onclick={() => openEditor(selected.id)}
      >
        Edit
      </button>
      <button
        class="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow hover:bg-red-50"
        type="button"
        onclick={() => {
          if (window.confirm(`Delete ${selected.firstName} ${selected.lastName}?`)) {
            family.deletePerson(selected.id);
          }
        }}
      >
        Delete
      </button>
    {/if}
  </div>

  {#if pov && focal}
    <div
      class="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-stone-200 bg-white/95 px-4 py-2 shadow-md"
    >
      <span class="text-sm text-stone-700">
        Showing tree around <strong>{focal.firstName} {focal.lastName}</strong>
      </span>
      <button
        class="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700"
        type="button"
        onclick={exitPov}
      >
        Show full tree
      </button>
    </div>
  {/if}

  {#if editing}
    {@const person = editing.id ? (family.people[editing.id] ?? null) : null}
    <PersonEditor
      {person}
      preset={addRelativePreset}
      onClose={() => {
        editing = null;
        addRelativePreset = null;
      }}
    />
  {/if}
</div>
