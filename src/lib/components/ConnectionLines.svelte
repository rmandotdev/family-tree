<script lang="ts">
import type { CoupleLayout, Point } from "$lib/family/layout";
import { connectionSegments } from "$lib/family/lines";

let {
  positions,
  couples,
  siblingGroups = [],
}: {
  positions: Map<string, Point>;
  couples: CoupleLayout[];
  siblingGroups?: Array<string[]>;
} = $props();

const segments = $derived(
  connectionSegments(positions, couples, siblingGroups),
);
</script>

{#each segments as d}
  <path
    {d}
    class="stroke-stone-400"
    fill="none"
    stroke-width="2"
    stroke-linecap="round"
  />
{/each}
