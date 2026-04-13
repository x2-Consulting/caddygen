<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Layers, Trash2 } from 'lucide-vue-next';
import { useTemplates } from '../composables/useTemplates';
import type { HostTemplate } from '../composables/useTemplates';

defineProps<{ show: boolean }>();

const emit = defineEmits<{
  close: [];
  select: [template: HostTemplate];
}>();

const { templates, deleteTemplate } = useTemplates();

const searchQuery = ref('');

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter(t => t.name.toLowerCase().includes(q));
});

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function confirmDelete(id: string, event: Event) {
  event.stopPropagation();
  deleteTemplate(id);
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="emit('close')" />

    <!-- Modal -->
    <div class="relative bg-card border border-border/50 rounded-lg shadow-lg w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-border/50">
        <div class="flex items-center gap-2">
          <Layers class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-semibold">Host Templates</h2>
        </div>
        <button @click="emit('close')" class="text-muted-foreground hover:text-foreground">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Search -->
      <div class="px-4 pt-4" v-if="templates.length > 3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search templates..."
          class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm mb-0"
        />
      </div>

      <!-- Empty state -->
      <div v-if="templates.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <Layers class="w-10 h-10 text-muted-foreground/40" />
        <p class="text-muted-foreground text-sm">No templates saved yet.</p>
        <p class="text-muted-foreground text-xs">Open a host form and use <strong>Save as template</strong> to save a configuration for reuse.</p>
      </div>

      <!-- Template list -->
      <div v-else class="flex-1 overflow-y-auto p-4 space-y-2">
        <div
          v-for="template in filtered"
          :key="template.id"
          @click="emit('select', template); emit('close')"
          class="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div class="min-w-0">
            <p class="font-medium truncate">{{ template.name }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Saved {{ formatDate(template.createdAt) }}</p>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <span v-if="template.config.reverseProxy" class="badge">Reverse proxy</span>
              <span v-if="template.config.fileServer" class="badge">File server</span>
              <span v-if="template.config.tls?.email" class="badge">HTTPS (email)</span>
              <span v-if="template.config.tls?.selfSigned" class="badge">Self-signed TLS</span>
              <span v-if="template.config.tls?.certFile" class="badge">Custom cert</span>
              <span v-if="template.config.encode" class="badge">Compression</span>
              <span v-if="template.config.basicAuth?.length" class="badge">Basic auth</span>
              <span v-if="template.config.cors?.enabled" class="badge">CORS</span>
              <span v-if="template.config.security?.ipFilter?.enabled" class="badge">IP filter</span>
              <span v-if="template.config.security?.rateLimit?.enabled" class="badge">Rate limit</span>
              <span v-if="template.config.security?.forwardAuth?.enabled" class="badge">Forward auth</span>
              <span v-if="template.config.security?.cspEnabled" class="badge">CSP</span>
            </div>
          </div>
          <button
            @click="confirmDelete(template.id, $event)"
            class="ml-3 flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete template"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <div v-if="filtered.length === 0 && searchQuery" class="text-center py-4 text-sm text-muted-foreground">
          No templates match "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge {
  display: inline-block;
  font-size: 0.65rem;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}
</style>
