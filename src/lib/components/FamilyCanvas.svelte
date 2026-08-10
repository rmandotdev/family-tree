<script lang="ts">
import type { Snippet } from "svelte";
import { canvas } from "./pan.svelte";

let {
  contentWidth,
  contentHeight,
  recenterKey,
  children,
}: {
  contentWidth: number;
  contentHeight: number;
  recenterKey?: number;
  children: Snippet;
} = $props();

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

let viewport = $state<HTMLDivElement>();
let pan = $state({ x: 0, y: 0 });
let zoom = $state(1);
let pointer: { id: number; x: number; y: number } | null = null;
let interacted = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function zoomAt(cx: number, cy: number, next: number) {
  const prev = zoom;
  const wx = (cx - pan.x) / prev;
  const wy = (cy - pan.y) / prev;
  pan.x = cx - wx * next;
  pan.y = cy - wy * next;
  zoom = next;
  interacted = true;
}

function zoomBy(factor: number) {
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  zoomAt(
    rect.width / 2,
    rect.height / 2,
    clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM),
  );
}

$effect(() => {
  const el = viewport;
  if (!el) return;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAt(
      e.clientX - rect.left,
      e.clientY - rect.top,
      clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM),
    );
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
});

function onPointerDown(e: PointerEvent) {
  if (e.target instanceof Element && e.target.closest("button")) return;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  viewport?.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!pointer || pointer.id !== e.pointerId) return;
  const dx = e.clientX - pointer.x;
  const dy = e.clientY - pointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) canvas.isPanning = true;
  pan.x += dx;
  pan.y += dy;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
}

function onPointerUp(e: PointerEvent) {
  if (!pointer || pointer.id !== e.pointerId) return;
  pointer = null;
  interacted = true;
  if (canvas.isPanning) setTimeout(() => (canvas.isPanning = false), 0);
}

function resetView() {
  pan = { x: 0, y: 0 };
  zoom = 1;
  interacted = false;
}

$effect(() => {
  const el = viewport;
  if (interacted || !el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w === 0 || h === 0) return;
  pan.x = (w - contentWidth * zoom) / 2;
  pan.y = (h - contentHeight * zoom) / 2;
});

let recenteredKey: number | undefined;
$effect(() => {
  const el = viewport;
  const key = recenterKey;
  if (!el || key === undefined || key === recenteredKey) return;
  recenteredKey = key;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w === 0 || h === 0) return;
  pan.x = (w - contentWidth * zoom) / 2;
  pan.y = (h - contentHeight * zoom) / 2;
});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (canvas panning) -->
<div
  class="absolute inset-0 touch-none select-none overflow-hidden"
  bind:this={viewport}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <div
    class="absolute left-0 top-0 will-change-transform"
    style:transform="translate({pan.x}px, {pan.y}px) scale({zoom})"
    style:transform-origin="0 0"
    style:width="{contentWidth}px"
    style:height="{contentHeight}px"
  >
    {@render children()}
  </div>

  <div
    class="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white/90 shadow-md"
  >
    <button
      class="px-3 py-1.5 text-sm hover:bg-stone-100"
      type="button"
      onclick={() => zoomBy(1.25)}
      aria-label="Zoom in"
    >
      +
    </button>
    <button
      class="border-t border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-100"
      type="button"
      onclick={resetView}
    >
      reset
    </button>
    <button
      class="border-t border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-100"
      type="button"
      onclick={() => zoomBy(0.8)}
      aria-label="Zoom out"
    >
      −
    </button>
  </div>
</div>
