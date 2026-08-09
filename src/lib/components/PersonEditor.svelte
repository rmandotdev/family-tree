<script lang="ts">
import { family } from "$lib/family/family.svelte";
import type { Gender, Person, PersonInput } from "$lib/family/types";

let { person, onClose }: { person: Person | null; onClose: () => void } =
  $props();

let firstName = $state(person?.firstName ?? "");
let lastName = $state(person?.lastName ?? "");
let gender = $state<Gender>(person?.gender ?? "other");
let birthDate = $state(person?.birthDate ?? "");
let deathDate = $state(person?.deathDate ?? "");
let parents = $state<Set<string>>(new Set(person?.parentIds ?? []));
let spouseId = $state(person?.spouseIds[0] ?? "");
let error = $state("");

const candidates = $derived(family.list.filter((p) => p.id !== person?.id));

const spouseOptions = $derived(
  candidates.filter(
    (p) => p.spouseIds.length === 0 || p.spouseIds.includes(person?.id ?? ""),
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
  const target = person ?? family.addPerson(input);
  if (person) family.updatePerson(target.id, input);
  family.setParents(target.id, [...parents]);
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
    aria-label={person ? "Edit person" : "Add person"}
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <h2 class="text-lg font-semibold text-stone-900">
      {person ? "Edit person" : "Add person"}
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
            class="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            bind:value={gender}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
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

      <fieldset class="text-sm">
        <legend class="font-medium text-stone-700">Parents</legend>
        <div
          class="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-2"
        >
          {#if candidates.length === 0}
            <p class="text-stone-400">No other people yet.</p>
          {/if}
          {#each candidates as candidate (candidate.id)}
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={parents.has(candidate.id)}
                onchange={(e) => {
                  if (e.currentTarget.checked) {
                    parents.add(candidate.id);
                  } else {
                    parents.delete(candidate.id);
                  }
                }}
              />
              <span class="truncate text-stone-700">
                {candidate.firstName} {candidate.lastName}
              </span>
            </label>
          {/each}
        </div>
      </fieldset>

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
