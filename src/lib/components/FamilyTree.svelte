<script lang="ts">
import { branchActions, filterCollapsed } from "$lib/family/filter";
import { computeLayout } from "$lib/family/layout";
import type { DisplayMode } from "$lib/family/subtree";
import { computeSubtree } from "$lib/family/subtree";
import { tree } from "$lib/family/tree.svelte";
import type { Gender } from "$lib/family/types";
import ConnectionLines from "./ConnectionLines.svelte";
import FamilyCanvas from "./FamilyCanvas.svelte";
import type { CardAction } from "./PersonCard.svelte";
import PersonCard from "./PersonCard.svelte";
import PersonEditor from "./PersonEditor.svelte";
import { canvas } from "./pan.svelte";

interface PovCollapseState {
  children: Set<string>;
  parents: Set<string>;
  expandedParents: Set<string>;
}

const emptyPovCollapse: PovCollapseState = {
  children: new Set<string>(),
  parents: new Set<string>(),
  expandedParents: new Set<string>(),
};

let pov = $state<{ focalId: string }>({ focalId: tree.sourceId ?? "" });
let mode = $state<DisplayMode>("all");
let collapseByPov = $state<Record<string, PovCollapseState>>({});
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

const fullData = $derived({ people: tree.people, families: tree.families });
const povCollapse = $derived(collapseByPov[pov.focalId] ?? emptyPovCollapse);
const collapsedChildren = $derived(povCollapse.children);
const collapsedParents = $derived(povCollapse.parents);
const expandedParents = $derived(povCollapse.expandedParents);
const subtreeData = $derived(computeSubtree(fullData, pov.focalId, { mode }));
const viewData = $derived(
  filterCollapsed(subtreeData, fullData, collapsedChildren, collapsedParents, {
    focalId: pov.focalId,
    expandedParents,
  }),
);
const actions = $derived(branchActions(fullData, pov.focalId));
const layout = $derived(computeLayout(viewData));
const visibleList = $derived(Object.values(viewData.people));
const focal = $derived(tree.people[pov.focalId] ?? null);
const onSource = $derived(pov.focalId === tree.sourceId);

function toggleMenu(id: string) {
  if (canvas.isPanning) return;
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
  const person = tree.people[id];
  if (!person) return;
  let preset: typeof addRelativePreset = null;
  if (relation === "spouse") {
    preset = { spouseId: id, gender: oppositeGender(person.gender) };
  } else if (relation === "child") {
    const spouseId = tree.spouseOf(id);
    const spouse = spouseId ? tree.people[spouseId] : undefined;
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
      ? tree.families[person.parentFamilyId]
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
      toggleCollapse("children", personId);
      break;
    case "toggleParents":
      toggleCollapse(
        actions.get(personId)?.parentsHiddenByDefault
          ? "expandedParents"
          : "parents",
        personId,
      );
      break;
    case "makeSource":
      tree.setSource(personId);
      break;
  }
}

function toggleCollapse(kind: keyof PovCollapseState, personId: string) {
  const current = collapseByPov[pov.focalId] ?? {
    children: new Set<string>(),
    parents: new Set<string>(),
    expandedParents: new Set<string>(),
  };
  const next = new Set(current[kind]);
  if (next.has(personId)) next.delete(personId);
  else next.add(personId);
  collapseByPov = {
    ...collapseByPov,
    [pov.focalId]: { ...current, [kind]: next },
  };
}

function goBack() {
  pov = { focalId: tree.sourceId ?? "" };
  recenterKey += 1;
}
</script>

<div class="relative flex h-full w-full flex-col overflow-hidden bg-stone-100">
  <header
    class="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-sm"
  >
    <div></div>
    <div
      class="flex items-center gap-1 rounded-lg border border-stone-300 bg-white p-1 shadow-sm"
    >
      {#each ([
        { value: "all", label: "All relatives" },
        { value: "direct", label: "Direct relatives" },
        { value: "directAndChildren", label: "Direct + their children" },
      ] as const) as item (item.value)}
        <button
          class="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          class:bg-stone-900={mode === item.value}
          class:text-white={mode === item.value}
          class:bg-stone-100={mode !== item.value}
          class:text-stone-600={mode !== item.value}
          class:hover:bg-stone-200={mode !== item.value}
          type="button"
          onclick={() => (mode = item.value)}
        >
          {item.label}
        </button>
      {/each}
    </div>
  </header>

  <div class="relative flex-1">
    <FamilyCanvas
      contentWidth={layout.width}
      contentHeight={layout.height}
      {recenterKey}
    >
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
        {@const fam = person.parentFamilyId ? tree.families[person.parentFamilyId] : undefined}
        {@const pos = layout.positions.get(person.id)}
        {@const personActions = actions.get(person.id)}
        {@const parentsHidden = (personActions?.parentsHiddenByDefault ?? false) ? !expandedParents.has(person.id) : collapsedParents.has(person.id)}
        {#if pos}
          <PersonCard
            {person}
            x={pos.x}
            y={pos.y}
            menuOpen={openMenuId === person.id}
            childrenCollapsed={collapsedChildren.has(person.id)}
            parentsCollapsed={parentsHidden}
            canToggleChildren={personActions?.canCollapseChildren ?? false}
            canToggleParents={personActions?.canCollapseParents ?? false}
            motherMissing={fam?.wifeId === undefined}
            fatherMissing={fam?.husbandId === undefined}
            isPov={person.id === pov.focalId}
            onToggleMenu={() => toggleMenu(person.id)}
            onAction={(action) => handleAction(person.id, action)}
          />
        {/if}
      {/each}
    </FamilyCanvas>
  </div>

  {#if focal && !onSource}
    <div
      class="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-stone-200 bg-white/95 px-4 py-2 shadow-md"
    >
      <span class="text-sm text-stone-700">
        Showing tree around <strong>{focal.firstName} {focal.lastName}</strong>
      </span>
      <button
        class="cursor-pointer rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700"
        type="button"
        onclick={goBack}
      >
        Go back
      </button>
    </div>
  {/if}

  {#if editing}
    {@const person = editing.id ? (tree.people[editing.id] ?? null) : null}
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
