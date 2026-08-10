<script lang="ts">
import { family } from "$lib/family/family.svelte";
import type { Gender, Person, PersonInput } from "$lib/family/types";

let {
  person,
  onClose,
  preset = null,
}: {
  person: Person | null;
  onClose: () => void;
  preset?: {
    spouseId?: string;
    motherId?: string;
    fatherId?: string;
    gender?: Gender;
    parentOf?: string;
  } | null;
} = $props();

const isAddingParent = $derived(preset?.parentOf !== undefined);

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
    ? (family.families[person.parentFamilyId]?.wifeId ?? "")
    : (preset?.motherId ?? ""),
);
let fatherId = $state(
  person?.parentFamilyId
    ? (family.families[person.parentFamilyId]?.husbandId ?? "")
    : (preset?.fatherId ?? ""),
);
let spouseId = $state(
  person ? (family.spouseOf(person.id) ?? "") : (preset?.spouseId ?? ""),
);
let error = $state("");

const motherOptions = $derived(
  family.list.filter(
    (p) =>
      p.gender === "female" && family.canBeParent(person?.id ?? null, p.id),
  ),
);

const fatherOptions = $derived(
  family.list.filter(
    (p) => p.gender === "male" && family.canBeParent(person?.id ?? null, p.id),
  ),
);

const spouseOptions = $derived(
  family.list.filter(
    (p) =>
      p.id !== person?.id &&
      family.canBeSpouse(person?.id ?? null, p.id) &&
      (family.spouseOf(p.id) === null || family.spouseOf(p.id) === person?.id),
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
    const target = family.addPerson(input);
    const child = family.people[preset.parentOf];
    const existing = child?.parentFamilyId
      ? family.families[child.parentFamilyId]
      : undefined;
    if (preset.gender === "male") {
      family.setParents(preset.parentOf, existing?.wifeId, target.id);
    } else {
      family.setParents(preset.parentOf, target.id, existing?.husbandId);
    }
    onClose();
    return;
  }
  const target = person ?? family.addPerson(input);
  if (person) family.updatePerson(target.id, input);
  family.setParents(target.id, motherId || undefined, fatherId || undefined);
  family.setSpouse(target.id, spouseId || null);
  onClose();
}

function remove() {
  if (!person) return;
  if (window.confirm(`Delete ${person.firstName} ${person.lastName}?`)) {
    family.deletePerson(person.id);
    onClose();
  }
}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button
    class="absolute inset-0 cursor-default bg-black/40"
    type="button"
    onclick={onClose}
    aria-label="Close editor"
    tabindex="-1"
  ></button>
  <div
    class="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-label={title}
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <h2 class="text-lg font-semibold text-stone-900">
      {title}
    </h2>

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

      {#if !isAddingParent}
        <label class="block text-sm">
          <span class="font-medium text-stone-700">Spouse</span>
          <select
            class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            bind:value={spouseId}
          >
            <option value="">—</option>
            {#each spouseOptions as option (option.id)}
              <option value={option.id}>
                {option.firstName} {option.lastName}
              </option>
            {/each}
          </select>
        </label>

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
                  {option.firstName} {option.lastName}
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
                  {option.firstName} {option.lastName}
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
          {#if person}
            <button
              class="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              type="button"
              onclick={remove}
            >
              Delete
            </button>
          {/if}
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            type="button"
            onclick={onClose}
          >
            Cancel
          </button>
          <button
            class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            type="submit"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
