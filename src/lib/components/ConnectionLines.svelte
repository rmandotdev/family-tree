<script lang="ts">
import type { GroupGrid, Point } from "$lib/family/layout";
import { connectionSegments } from "$lib/family/lines";

let {
  positions,
  groups,
  siblingGroups = [],
}: {
  positions: Map<string, Point>;
  groups: GroupGrid[];
  siblingGroups?: Array<string[]>;
} = $props();

const segments = $derived(connectionSegments(positions, groups, siblingGroups));
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
