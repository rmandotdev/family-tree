<script lang="ts">
import { formatLifespan } from "$lib/family/format";
import { CARD_H, CARD_W } from "$lib/family/layout";
import type { Person } from "$lib/family/types";
import { canvas } from "./pan.svelte";

let {
  person,
  x,
  y,
  selected,
  onOpen,
}: {
  person: Person;
  x: number;
  y: number;
  selected: boolean;
  onOpen: (id: string) => void;
} = $props();

const accent = {
  male: "border-sky-400",
  female: "border-rose-400",
  unknown: "border-stone-400",
}[person.gender];

const cardClass = `absolute cursor-pointer rounded-lg border-l-4 bg-white p-2 text-left shadow-md ${accent} ${
  selected ? "ring-2 ring-sky-500" : "hover:shadow-lg"
}`;

const lifespan = $derived(formatLifespan(person));
</script>

<button
  class={cardClass}
  style:left="{x}px"
  style:top="{y}px"
  style:width="{CARD_W}px"
  style:height="{CARD_H}px"
  type="button"
  onclick={() => {
    if (canvas.isPanning) return;
    onOpen(person.id);
  }}
>
  <span class="block truncate font-semibold text-stone-800">
    {person.firstName} {person.lastName}
  </span>
  {#if lifespan}
    <span class="mt-0.5 block truncate text-xs text-stone-500">{lifespan}</span>
  {/if}
</button>
