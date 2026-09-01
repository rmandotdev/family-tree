<script lang="ts">
import { tree } from "$lib/family/tree.svelte";
import type { Gender, Person, PersonInput } from "$lib/family/types";
import Modal from "./ui/Modal.svelte";

let {
  person,
  onClose,
  preset = null,
}: {
  person: Person | null;
  onClose: () => void;
  preset?: {
    partnerId?: string;
    motherId?: string;
    fatherId?: string;
    gender?: Gender;
    parentOf?: string;
    siblingOf?: string;
  } | null;
} = $props();

const isAddingParent = $derived(preset?.parentOf !== undefined);
const isSibling = $derived(preset?.siblingOf !== undefined);
const showPartner = $derived(preset?.partnerId !== undefined);
const showParents = $derived(!isAddingParent && !isSibling && preset !== null);

const title = $derived(
  person
    ? "Edit person"
    : isAddingParent
      ? preset?.gender === "male"
        ? "Add a father"
        : "Add a mother"
      : preset
        ? "Add a relative"
        : "Add person",
);

let firstName = $state(person?.firstName ?? "");
let lastName = $state(person?.lastName ?? "");
let gender = $state<Gender>(person?.gender ?? preset?.gender ?? "unknown");
let birthDate = $state(person?.birthDate ?? "");
let deathDate = $state(person?.deathDate ?? "");
let motherId = $state(
  person?.parentFamilyId
    ? (tree.families[person.parentFamilyId]?.wifeId ?? "")
    : (preset?.motherId ?? ""),
);
let fatherId = $state(
  person?.parentFamilyId
    ? (tree.families[person.parentFamilyId]?.husbandId ?? "")
    : (preset?.fatherId ?? ""),
);
let partnerId = $state(
  person ? (tree.partnerOf(person.id) ?? "") : (preset?.partnerId ?? ""),
);
let error = $state("");

const motherOptions = $derived(
  tree.list.filter(
    (p) => p.gender === "female" && tree.canBeParent(person?.id ?? null, p.id),
  ),
);

const fatherOptions = $derived(
  tree.list.filter(
    (p) => p.gender === "male" && tree.canBeParent(person?.id ?? null, p.id),
  ),
);

const partnerOptions = $derived(
  tree.list.filter(
    (p) =>
      p.id !== person?.id &&
      tree.canBePartner(person?.id ?? null, p.id) &&
      (tree.partnerOf(p.id) === null || tree.partnerOf(p.id) === person?.id),
  ),
);

function save() {
  const name = firstName.trim();
  if (!name) {
    error = "First name is required";
    return;
  }
  const input: PersonInput = {
    firstName: name,
    lastName: lastName.trim(),
    gender,
    birthDate: birthDate || undefined,
    deathDate: deathDate || undefined,
  };
  if (preset?.parentOf) {
    const target = tree.addPerson(input);
    const child = tree.people[preset.parentOf];
    const existing = child?.parentFamilyId
      ? tree.families[child.parentFamilyId]
      : undefined;
    if (preset.gender === "male") {
      tree.setParents(preset.parentOf, existing?.wifeId, target.id);
    } else {
      tree.setParents(preset.parentOf, target.id, existing?.husbandId);
    }
    onClose();
    return;
  }
  if (preset?.siblingOf) {
    tree.addSibling(preset.siblingOf, input);
    onClose();
    return;
  }
  const target = person ?? tree.addPerson(input);
  if (person) tree.updatePerson(target.id, input);
  tree.setParents(target.id, motherId || undefined, fatherId || undefined);
  tree.setPartner(target.id, partnerId || null);
  onClose();
}

function remove() {
  if (!person) return;
  if (window.confirm(`Delete ${person.firstName} ${person.lastName}?`)) {
    tree.deletePerson(person.id);
    onClose();
  }
}
</script>

<Modal {title} {onClose}>
  <form
    class="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
    onsubmit={(e) => {
      e.preventDefault();
      save();
    }}
  >
    <div class="grid grid-cols-2 gap-3">
      <label class="block text-sm">
        <span class="font-medium text-stone-700">First name *</span>
        <input
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          bind:value={firstName}
          required
        />
      </label>
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Last name</span>
        <input
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          bind:value={lastName}
        />
      </label>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Gender</span>
        <select
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
          bind:value={gender}
          disabled={isAddingParent}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Birth</span>
        <input
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          type="date"
          bind:value={birthDate}
        />
      </label>
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Death</span>
        <input
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          type="date"
          bind:value={deathDate}
        />
      </label>
    </div>

    {#if showPartner}
      <label class="block text-sm">
        <span class="font-medium text-stone-700">Partner</span>
        <select
          class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
          bind:value={partnerId}
        >
          <option value="">—</option>
          {#each partnerOptions as option (option.id)}
            <option value={option.id}>
              {option.firstName}
              {option.lastName}
            </option>
          {/each}
        </select>
      </label>
    {/if}

    {#if showParents}
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">
          <span class="font-medium text-stone-700">Mother</span>
          <select
            class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            bind:value={motherId}
          >
            <option value="">—</option>
            {#each motherOptions as option (option.id)}
              <option value={option.id}>
                {option.firstName}
                {option.lastName}
              </option>
            {/each}
          </select>
        </label>
        <label class="block text-sm">
          <span class="font-medium text-stone-700">Father</span>
          <select
            class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            bind:value={fatherId}
          >
            <option value="">—</option>
            {#each fatherOptions as option (option.id)}
              <option value={option.id}>
                {option.firstName}
                {option.lastName}
              </option>
            {/each}
          </select>
        </label>
      </div>
    {/if}

    {#if error}
      <p class="text-sm text-red-600">{error}</p>
    {/if}

    <div
      class="flex items-center justify-between gap-2 border-t border-stone-200 pt-4"
    >
      <div>
        {#if person && person.id !== tree.sourceId}
          <button
            class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            type="button"
            onclick={remove}
          >
            Delete
          </button>
        {/if}
      </div>
      <div class="flex gap-2">
        <button
          class="cursor-pointer rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          type="button"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          class="cursor-pointer rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          type="submit"
        >
          Save
        </button>
      </div>
    </div>
  </form>
</Modal>
