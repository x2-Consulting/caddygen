<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

defineProps<{ content: string }>();

const open = ref(false);
const btn = ref<HTMLButtonElement | null>(null);
const tip = ref<HTMLDivElement | null>(null);

// Close on outside click
function onDocClick(e: MouseEvent) {
  if (
    open.value &&
    !btn.value?.contains(e.target as Node) &&
    !tip.value?.contains(e.target as Node)
  ) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <span class="help-wrap">
    <button
      ref="btn"
      type="button"
      class="help-btn"
      :aria-expanded="open"
      aria-label="Help"
      @click.stop="open = !open"
      @mouseenter="open = true"
      @mouseleave="open = false"
    >?</button>
    <div
      v-if="open"
      ref="tip"
      class="help-tip"
      role="tooltip"
    >{{ content }}</div>
  </span>
</template>

<style scoped>
.help-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  vertical-align: middle;
}

.help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.help-btn:hover,
.help-btn[aria-expanded="true"] {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.5);
}

.help-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  padding: 0.55rem 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: pre-wrap;
  width: max-content;
  max-width: min(280px, calc(100vw - 2rem));
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.18);
  z-index: 100;
  pointer-events: none;
}

/* Arrow */
.help-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: hsl(var(--border));
}
.help-tip::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-1px);
  border: 5px solid transparent;
  border-top-color: hsl(var(--popover));
  z-index: 1;
}
</style>
