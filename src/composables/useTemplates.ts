import { ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { CaddyHost } from '../types/caddy';

export interface HostTemplate {
  id: string;
  name: string;
  /** Saved host config, omitting the instance-specific id and domain */
  config: Omit<CaddyHost, 'id' | 'domain'>;
  createdAt: number;
}

const STORAGE_KEY = 'caddygen:templates';

function loadFromStorage(): HostTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Shared reactive state across all composable instances
const templates = ref<HostTemplate[]>(loadFromStorage());

watch(templates, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

export function useTemplates() {
  function saveTemplate(host: CaddyHost, name: string): HostTemplate {
    const { id: _id, domain: _domain, ...config } = host;
    const template: HostTemplate = {
      id: uuidv4(),
      name: name.trim() || host.domain || 'Unnamed template',
      config,
      createdAt: Date.now(),
    };
    templates.value = [template, ...templates.value];
    return template;
  }

  function deleteTemplate(id: string) {
    templates.value = templates.value.filter(t => t.id !== id);
  }

  function applyTemplate(template: HostTemplate): Omit<CaddyHost, 'id' | 'domain'> {
    // Deep-clone to avoid shared references between hosts
    return JSON.parse(JSON.stringify(template.config));
  }

  return { templates, saveTemplate, deleteTemplate, applyTemplate };
}
