<script lang="ts">
import { family } from "$lib/family/family.svelte";
import { computeLayout } from "$lib/family/layout";
import ConnectionLines from "./ConnectionLines.svelte";
import FamilyCanvas from "./FamilyCanvas.svelte";
import PersonCard from "./PersonCard.svelte";
import PersonEditor from "./PersonEditor.svelte";

const layout = $derived(
  computeLayout({ people: family.people, families: family.families }),
);
const selected = $derived(family.selected);

let editing = $state<{ id: string | null } | null>(null);

function openEditor(id: string | null) {
  editing = { id };
}
</script>

<div class="relative h-full w-full overflow-hidden bg-stone-100">
  <FamilyCanvas contentWidth={layout.width} contentHeight={layout.height}>
    {#if family.list.length > 0}
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

      {#each family.list as person (person.id)}
        {@const pos = layout.positions.get(person.id)}
        {#if pos}
          <PersonCard
            {person}
            x={pos.x}
            y={pos.y}
            selected={family.selectedId === person.id}
            onOpen={openEditor}
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

  {#if editing}
    {@const person = editing.id ? (family.people[editing.id] ?? null) : null}
    <PersonEditor
      {person}
      onClose={() => {
        editing = null;
      }}
    />
  {/if}
</div>
