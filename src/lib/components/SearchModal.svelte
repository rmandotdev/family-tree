<script lang="ts">
import { formatLifespan } from "$lib/family/format";
import { searchPeople } from "$lib/family/search";
import { tree } from "$lib/family/tree.svelte";
import Modal from "./ui/Modal.svelte";

let {
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (personId: string) => void;
} = $props();

let query = $state("");
let input = $state<HTMLInputElement>();

const results = $derived(searchPeople(tree.list, query));

$effect(() => {
  input?.focus();
});
</script>

<Modal title="Search people" {onClose}>
  <div class="mt-4">
    <div class="relative">
      <svg
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </svg>
      <input
        bind:this={input}
        bind:value={query}
        type="search"
        class="w-full rounded-md border border-stone-300 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
        placeholder="Search by first or last name"
        autocomplete="off"
        aria-label="Search people"
      />
    </div>

    {#if results.length === 0}
      <p class="mt-4 text-sm text-stone-500">No people found.</p>
    {:else}
      <ul class="mt-3 max-h-72 overflow-y-auto">
        {#each results as person (person.id)}
          <li class="px-1 py-0.5">
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 rounded-md border-l-4 bg-white px-3 py-2 text-left hover:bg-stone-50"
              class:border-sky-400={person.gender === "male"}
              class:border-rose-400={person.gender === "female"}
              class:border-stone-400={person.gender === "unknown"}
              onclick={() => onSelect(person.id)}
            >
              <span
                class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800"
              >
                {person.firstName}
                {person.lastName}
              </span>
              {#if formatLifespan(person)}
                <span class="shrink-0 text-xs text-stone-500">
                  {formatLifespan(person)}
                </span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Modal>
