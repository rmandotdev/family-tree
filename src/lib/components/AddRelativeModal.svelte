<script lang="ts">
import { tree } from "$lib/family/tree.svelte";
import type { Person } from "$lib/family/types";
import Modal from "./ui/Modal.svelte";

export type RelativeRelation =
  | "child"
  | "partner"
  | "sibling"
  | "mother"
  | "father";

let {
  person,
  onClose,
  onSelect,
}: {
  person: Person;
  onClose: () => void;
  onSelect: (relation: RelativeRelation) => void;
} = $props();

const family = $derived(
  person.parentFamilyId ? tree.families[person.parentFamilyId] : undefined,
);

const fullName = $derived(`${person.firstName} ${person.lastName}`.trim());

const options = $derived(
  ([
    { relation: "child", label: "Child", available: true },
    { relation: "partner", label: "Partner", available: true },
    { relation: "sibling", label: "Sibling", available: true },
    {
      relation: "mother",
      label: "Mother",
      available: family?.wifeId === undefined,
    },
    {
      relation: "father",
      label: "Father",
      available: family?.husbandId === undefined,
    },
  ] as const).filter((option) => option.available),
);
</script>

<Modal title={`Add a relative of ${fullName}`} {onClose}>
  <div class="mt-4 flex flex-col gap-2">
    {#each options as option (option.relation)}
      <button
        class="cursor-pointer rounded-md border border-stone-200 px-4 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
        type="button"
        onclick={() => onSelect(option.relation)}
      >
        Add a {option.label.toLowerCase()}
      </button>
    {/each}
  </div>
  <div class="mt-6 flex justify-end">
    <button
      class="cursor-pointer rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
      type="button"
      onclick={onClose}
    >
      Close
    </button>
  </div>
</Modal>
