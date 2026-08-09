<script lang="ts">
import type { CoupleLayout, Point } from "$lib/family/layout";
import { BUS_OFFSET, CARD_H, CARD_W } from "$lib/family/layout";

let {
  positions,
  couples,
}: {
  positions: Map<string, Point>;
  couples: CoupleLayout[];
} = $props();

function center(id: string): Point | null {
  const p = positions.get(id);
  return p ? { x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 } : null;
}

function spouseSegments(): { id: string; d: string }[] {
  const out: { id: string; d: string }[] = [];
  for (const couple of couples) {
    if (couple.parents.length !== 2) continue;
    const a = center(couple.parents[0]);
    const b = center(couple.parents[1]);
    if (!a || !b) continue;
    out.push({
      id: `spouse-${couple.parents.join("+")}`,
      d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
    });
  }
  return out;
}

function childSegments(): { id: string; d: string }[] {
  const out: { id: string; d: string }[] = [];
  for (const couple of couples) {
    if (couple.children.length === 0) continue;
    const tops = couple.children
      .map((id) => positions.get(id))
      .filter((p): p is Point => p !== undefined);
    if (tops.length === 0) continue;
    const xs = tops.map((p) => p.x + CARD_W / 2);
    const topY = tops[0].y;
    const busY = topY - BUS_OFFSET;

    let midX: number;
    let botY: number;
    if (couple.parents.length === 2) {
      const a = center(couple.parents[0]);
      const b = center(couple.parents[1]);
      if (!a || !b) continue;
      midX = (a.x + b.x) / 2;
      botY = a.y + CARD_H / 2;
    } else {
      const p = positions.get(couple.parents[0]);
      if (!p) continue;
      midX = p.x + CARD_W / 2;
      botY = p.y + CARD_H;
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const prefix = `child-${couple.parents.join("+")}`;
    out.push({ id: `${prefix}-drop`, d: `M ${midX} ${botY} V ${busY}` });
    out.push({ id: `${prefix}-bus`, d: `M ${minX} ${busY} H ${maxX}` });
    for (const x of xs) {
      out.push({ id: `${prefix}-${x}`, d: `M ${x} ${busY} V ${topY}` });
    }
  }
  return out;
}

const segments = $derived([...spouseSegments(), ...childSegments()]);
</script>

{#each segments as seg (seg.id)}
  <path
    d={seg.d}
    class="stroke-stone-400"
    fill="none"
    stroke-width="2"
    stroke-linecap="round"
  />
{/each}
