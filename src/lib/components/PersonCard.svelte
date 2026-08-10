<script lang="ts">
import { formatLifespan } from "$lib/family/format";
import { CARD_H, CARD_W } from "$lib/family/layout";
import type { Person } from "$lib/family/types";

export type CardAction =
  | "edit"
  | "focus"
  | "addChild"
  | "addSpouse"
  | "addSibling"
  | "toggleChildren"
  | "toggleParents";

let {
  person,
  x,
  y,
  selected,
  menuOpen,
  childrenCollapsed,
  parentsCollapsed,
  onToggleMenu,
  onAction,
}: {
  person: Person;
  x: number;
  y: number;
  selected: boolean;
  menuOpen: boolean;
  childrenCollapsed: boolean;
  parentsCollapsed: boolean;
  onToggleMenu: () => void;
  onAction: (action: CardAction) => void;
} = $props();

const accent = $derived(
  {
    male: "border-sky-400",
    female: "border-rose-400",
    unknown: "border-stone-400",
  }[person.gender],
);

const cardClass = $derived(
  `absolute cursor-pointer rounded-lg border-l-4 bg-white p-2 text-left shadow-md ${accent} ${
    selected ? "ring-2 ring-sky-500" : "hover:shadow-lg"
  }`,
);

const lifespan = $derived(formatLifespan(person));
</script>

<div class="absolute" style:left="{x}px" style:top="{y}px" data-card>
  <button
    class={cardClass}
    style:width="{CARD_W}px"
    style:height="{CARD_H}px"
    type="button"
    onclick={onToggleMenu}
  >
    <span class="block truncate font-semibold text-stone-800">
      {person.firstName} {person.lastName}
    </span>
    {#if lifespan}
      <span class="mt-0.5 block truncate text-xs text-stone-500"
        >{lifespan}</span
      >
    {/if}
  </button>

  {#if menuOpen}
    <div
      class="absolute z-50 w-52 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
      style:top={`${CARD_H + 4}px`}
    >
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("edit")}
      >
        Edit person
      </button>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("focus")}
      >
        Go to the person's tree
      </button>
      <div class="my-1 border-t border-stone-100"></div>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("addChild")}
      >
        Add a child
      </button>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("addSpouse")}
      >
        Add a spouse
      </button>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("addSibling")}
      >
        Add a sibling
      </button>
      <div class="my-1 border-t border-stone-100"></div>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("toggleChildren")}
      >
        {childrenCollapsed ? "Expand" : "Collapse"}
        children branch
      </button>
      <button
        class="block w-full px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
        type="button"
        onclick={() => onAction("toggleParents")}
      >
        {parentsCollapsed ? "Expand" : "Collapse"}
        parents branch
      </button>
    </div>
  {/if}
</div>
