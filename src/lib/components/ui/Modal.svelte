<script lang="ts">
import type { Snippet } from "svelte";

let {
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: Snippet;
} = $props();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") onClose();
}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button
    class="absolute inset-0 cursor-default bg-black/40"
    type="button"
    onclick={onClose}
    aria-label="Close dialog"
    tabindex="-1"
  ></button>

  <div
    class="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div class="flex items-start justify-between gap-4">
      <h2 class="text-lg font-semibold text-stone-900">{title}</h2>
      <button
        class="cursor-pointer rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
        type="button"
        onclick={onClose}
        aria-label="Close dialog"
      >
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>
    </div>
    {@render children()}
  </div>
</div>
