<script lang="ts">
import { manager } from "$lib/family/tree.svelte";
import Modal from "./ui/Modal.svelte";

let open = $state(false);
let nameDialog = $state<
  { mode: "new" } | { mode: "rename"; id: string } | null
>(null);
let nameInput = $state("");

const activeTrees = $derived(manager.metas);
const activeTree = $derived(manager.activeTreeId);

const current = $derived(activeTrees.find((t) => t.id === activeTree) ?? null);

function toggle() {
  open = !open;
}

function select(id: string) {
  open = false;
  manager.switchTree(id);
}

function openNew() {
  open = false;
  nameInput = "";
  nameDialog = { mode: "new" };
}

function openRename(id: string) {
  const meta = activeTrees.find((t) => t.id === id);
  open = false;
  nameInput = meta?.name ?? "";
  nameDialog = { mode: "rename", id };
}

function submit() {
  const name = nameInput.trim();
  if (!name) return;
  if (nameDialog?.mode === "new") {
    manager.createTree(name);
  } else if (nameDialog?.mode === "rename") {
    manager.renameTree(nameDialog.id, name);
  }
  nameDialog = null;
}

function remove(id: string) {
  const meta = activeTrees.find((t) => t.id === id);
  if (!meta) return;
  if (
    window.confirm(`Delete the tree "${meta.name}"? This cannot be undone.`)
  ) {
    manager.deleteTree(id);
  }
}

$effect(() => {
  if (!open) return;
  const close = (e: PointerEvent) => {
    if (
      e.target instanceof Element &&
      e.target.closest("[data-tree-switcher]")
    ) {
      return;
    }
    open = false;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") open = false;
  };
  document.addEventListener("pointerdown", close);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("pointerdown", close);
    document.removeEventListener("keydown", onKey);
  };
});
</script>

<div class="relative" data-tree-switcher>
  <button
    type="button"
    onclick={toggle}
    class="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    <span class="max-w-40 truncate">{current?.name ?? "Trees"}</span>
    <svg
      class="h-4 w-4 shrink-0 text-stone-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </button>

  {#if open}
    <div
      class="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
      role="listbox"
      aria-label="Trees"
    >
      <ul class="max-h-72 overflow-y-auto">
        {#each activeTrees as meta (meta.id)}
          <li
            class="flex items-center gap-0.5 px-1 py-0.5"
            class:bg-stone-100={meta.id === activeTree}
          >
            <button
              type="button"
              onclick={() => select(meta.id)}
              class="min-w-0 flex-1 cursor-pointer truncate px-2 py-1.5 text-left text-sm"
              class:font-semibold={meta.id === activeTree}
              class:text-stone-900={meta.id === activeTree}
              class:text-stone-600={meta.id !== activeTree}
              class:hover:bg-stone-100={meta.id !== activeTree}
              role="option"
              aria-selected={meta.id === activeTree}
            >
              {meta.name}
            </button>
            <button
              type="button"
              title={`Rename ${meta.name}`}
              aria-label={`Rename ${meta.name}`}
              onclick={() => openRename(meta.id)}
              class="cursor-pointer rounded-md p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
                ></path>
              </svg>
            </button>
            <button
              type="button"
              title={activeTrees.length <= 1 ? "You can't delete your only tree" : `Delete ${meta.name}`}
              aria-label={`Delete ${meta.name}`}
              onclick={() => remove(meta.id)}
              class="cursor-pointer rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
              disabled={activeTrees.length <= 1}
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </li>
        {/each}
      </ul>
      <div class="my-1 border-t border-stone-200"></div>
      <button
        type="button"
        onclick={openNew}
        class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium text-sky-600 hover:bg-sky-50"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14"></path>
          <path d="M12 5v14"></path>
        </svg>
        New tree
      </button>
    </div>
  {/if}
</div>

{#if nameDialog}
  <Modal
    title={nameDialog.mode === "new" ? "Create a new tree" : "Rename tree"}
    onClose={() => (nameDialog = null)}
  >
    <form
      class="mt-4 flex flex-col gap-4"
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Tree name</span>
        <input
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          bind:value={nameInput}
          placeholder="My family"
        />
      </label>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          onclick={() => (nameDialog = null)}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="cursor-pointer rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!nameInput.trim()}
        >
          Save
        </button>
      </div>
    </form>
  </Modal>
{/if}
