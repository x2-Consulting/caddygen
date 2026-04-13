import { ref, watch } from 'vue';

export interface ConfigSnapshot {
  id: string;
  serverId: string;
  serverName: string;
  serverType: 'caddy' | 'nginx' | 'traefik';
  content: string;
  savedAt: number;
}

const STORAGE_KEY = 'caddygen:configHistory';
const MAX_ENTRIES = 30;

function loadFromStorage(): ConfigSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Shared reactive state
const history = ref<ConfigSnapshot[]>(loadFromStorage());

watch(history, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

let _idCounter = 0;
function newId(): string {
  return `${Date.now()}-${++_idCounter}`;
}

export function useConfigHistory() {
  function addSnapshot(
    serverId: string,
    serverName: string,
    serverType: 'caddy' | 'nginx' | 'traefik',
    content: string,
  ) {
    // Avoid duplicates: skip if content is identical to the most recent entry for this server
    const existing = history.value.find(s => s.serverId === serverId);
    if (existing && existing.content === content) return;

    const snapshot: ConfigSnapshot = {
      id: newId(),
      serverId,
      serverName,
      serverType,
      content,
      savedAt: Date.now(),
    };

    // Prepend and cap
    const filtered = history.value.filter(s => s.id !== snapshot.id);
    history.value = [snapshot, ...filtered].slice(0, MAX_ENTRIES);
  }

  function deleteSnapshot(id: string) {
    history.value = history.value.filter(s => s.id !== id);
  }

  function clearServerHistory(serverId: string) {
    history.value = history.value.filter(s => s.serverId !== serverId);
  }

  function getServerHistory(serverId: string): ConfigSnapshot[] {
    return history.value.filter(s => s.serverId === serverId);
  }

  return { history, addSnapshot, deleteSnapshot, clearServerHistory, getServerHistory };
}
