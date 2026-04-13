<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Pencil, Trash2, Server, HardDrive, Lock, Zap, Github, ExternalLink, Settings, ChevronDown, ChevronUp, Upload, Sun, Moon, Share2, Check, X } from 'lucide-vue-next';
import type { CaddyHost, CaddyServer } from './types/caddy';
import { presets } from './presets';
import { v4 as uuidv4 } from 'uuid';
import HostForm from './components/HostForm.vue';
import CaddyConfig from './components/CaddyConfig.vue';
import ImportModal from './components/ImportModal.vue';
import LZString from 'lz-string';

// ── Theme ────────────────────────────────────────────────────────────────────

const isDark = ref(localStorage.getItem('theme') !== 'light');
const showDescription = ref(localStorage.getItem('showDescription') !== 'false');

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value);
}

function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  applyTheme();
}

function toggleDescription() {
  showDescription.value = !showDescription.value;
  localStorage.setItem('showDescription', showDescription.value.toString());
}

// ── Servers ───────────────────────────────────────────────────────────────────

function makeServer(name: string, hosts: CaddyHost[] = []): CaddyServer {
  return { id: uuidv4(), name, hosts };
}

const servers = ref<CaddyServer[]>([makeServer('Default')]);
const activeServerId = ref(servers.value[0].id);
const editingServerId = ref<string | null>(null);
const editingServerName = ref('');

const activeServer = computed(() =>
  servers.value.find(s => s.id === activeServerId.value) ?? servers.value[0]
);

const activeHosts = computed(() => activeServer.value.hosts);

function persist() {
  localStorage.setItem('caddyServers', JSON.stringify(servers.value));
}

function addServer() {
  const server = makeServer(`Server ${servers.value.length + 1}`);
  servers.value.push(server);
  activeServerId.value = server.id;
  persist();
  // Enter rename mode immediately
  startRename(server);
}

function deleteServer(id: string) {
  if (servers.value.length <= 1) return;
  const idx = servers.value.findIndex(s => s.id === id);
  servers.value.splice(idx, 1);
  if (activeServerId.value === id) {
    activeServerId.value = servers.value[Math.max(0, idx - 1)].id;
  }
  persist();
}

function startRename(server: CaddyServer) {
  editingServerId.value = server.id;
  editingServerName.value = server.name;
}

function commitRename() {
  if (!editingServerId.value) return;
  const server = servers.value.find(s => s.id === editingServerId.value);
  if (server && editingServerName.value.trim()) {
    server.name = editingServerName.value.trim();
    persist();
  }
  editingServerId.value = null;
}

function cancelRename() {
  editingServerId.value = null;
}

// ── Hosts ─────────────────────────────────────────────────────────────────────

const showForm = ref(false);
const editingHost = ref<CaddyHost | undefined>();
const showImportModal = ref(false);

function saveHost(host: CaddyHost) {
  const hosts = activeServer.value.hosts;
  const index = hosts.findIndex(h => h.id === host.id);
  if (index >= 0) {
    hosts[index] = host;
  } else {
    hosts.push(host);
  }
  persist();
  showForm.value = false;
  editingHost.value = undefined;
}

function editHost(host: CaddyHost) {
  editingHost.value = { ...host };
  showForm.value = true;
}

function deleteHost(id: string) {
  activeServer.value.hosts = activeServer.value.hosts.filter(h => h.id !== id);
  persist();
}

function cancelEdit() {
  showForm.value = false;
  editingHost.value = undefined;
}

function importHosts(newHosts: CaddyHost[]) {
  const existingDomains = new Set(activeServer.value.hosts.map(h => h.domain));
  const toAdd = newHosts.filter(h => !existingDomains.has(h.domain));
  activeServer.value.hosts.push(...toAdd);
  persist();
}

// ── Share ─────────────────────────────────────────────────────────────────────

const shareCopied = ref(false);

function shareConfig() {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(servers.value));
  const url = `${window.location.origin}${window.location.pathname}?config=${compressed}`;
  navigator.clipboard.writeText(url);
  shareCopied.value = true;
  setTimeout(() => { shareCopied.value = false; }, 2000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  applyTheme();

  const params = new URLSearchParams(window.location.search);
  const configParam = params.get('config');
  if (configParam) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(configParam);
      if (decompressed) {
        const parsed = JSON.parse(decompressed);
        // Support both old format (CaddyHost[]) and new format (CaddyServer[])
        if (Array.isArray(parsed) && parsed.length > 0 && 'hosts' in parsed[0]) {
          servers.value = parsed as CaddyServer[];
        } else if (Array.isArray(parsed)) {
          servers.value = [makeServer('Imported', parsed as CaddyHost[])];
        }
        activeServerId.value = servers.value[0].id;
        persist();
      }
    } catch {
      // Ignore malformed config params
    }
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  // Migrate old flat caddyHosts format
  const legacyHosts = localStorage.getItem('caddyHosts');
  if (legacyHosts) {
    try {
      const hosts = JSON.parse(legacyHosts) as CaddyHost[];
      servers.value = [makeServer('Default', hosts)];
      activeServerId.value = servers.value[0].id;
      persist();
      localStorage.removeItem('caddyHosts');
    } catch { /* ignore */ }
    return;
  }

  const saved = localStorage.getItem('caddyServers');
  if (saved) {
    try {
      servers.value = JSON.parse(saved);
      activeServerId.value = servers.value[0]?.id ?? activeServerId.value;
    } catch { /* ignore */ }
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <div class="container py-8 flex-1">

      <!-- Header -->
      <div class="flex items-start justify-between mb-8">
        <h1 class="flex items-center gap-3 text-4xl font-bold text-foreground">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Settings class="w-7 h-7 text-white" />
          </div>
          <div class="flex flex-col">
            <span>CaddyGen</span>
            <span class="text-lg font-normal text-muted-foreground">Caddy Config Generator</span>
          </div>
        </h1>
        <div class="flex items-center gap-2 pt-1">
          <button
            @click="toggleDark"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Sun v-if="isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>
          <button
            @click="shareConfig"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg px-4 py-2 transition-colors"
            title="Copy shareable link to clipboard"
          >
            <Check v-if="shareCopied" class="w-4 h-4 text-green-500" />
            <Share2 v-else class="w-4 h-4" />
            {{ shareCopied ? 'Copied!' : 'Share' }}
          </button>
          <button
            @click="showImportModal = true"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg px-4 py-2 transition-colors"
          >
            <Upload class="w-4 h-4" />
            Import Caddyfile
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="mb-6">
        <button
          class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          @click="toggleDescription"
        >
          <component :is="showDescription ? ChevronUp : ChevronDown" class="w-4 h-4" />
          <span>About CaddyGen</span>
        </button>
        <div
          v-if="showDescription"
          class="mt-2 text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <p>
            A user-friendly interface for generating Caddy server configurations. Create and manage reverse proxy and file server
            configurations with support for SSL, compression, security headers, and more.
          </p>
          <p>
            Choose from popular application presets or create custom configurations. All changes are saved locally in your browser.
          </p>
        </div>
      </div>

      <!-- Server tabs -->
      <div class="flex items-center gap-1 mb-6 flex-wrap border-b border-border/50 pb-3">
        <div
          v-for="server in servers"
          :key="server.id"
          class="group relative flex items-center"
        >
          <!-- Rename input -->
          <div v-if="editingServerId === server.id" class="flex items-center gap-1">
            <input
              v-model="editingServerName"
              class="px-3 py-1.5 text-sm rounded-lg border border-primary bg-background text-foreground outline-none"
              style="min-width: 8rem;"
              @keyup.enter="commitRename"
              @keyup.escape="cancelRename"
              @blur="commitRename"
              autofocus
            />
          </div>
          <!-- Tab button -->
          <button
            v-else
            @click="activeServerId = server.id"
            @dblclick="startRename(server)"
            :class="[
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
              activeServerId === server.id
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            ]"
            :title="'Double-click to rename'"
          >
            {{ server.name }}
          </button>
          <!-- Delete button (only when > 1 server) -->
          <button
            v-if="servers.length > 1 && editingServerId !== server.id"
            @click.stop="deleteServer(server.id)"
            class="ml-0.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            title="Delete server"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <button
          @click="addServer"
          class="ml-1 inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          title="Add new server"
        >
          <Plus class="w-3.5 h-3.5" />
          New Server
        </button>

        <!-- Server type toggle for active server -->
        <div class="ml-auto flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
          <button
            @click="activeServer.serverType = 'caddy'; persist()"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              (activeServer.serverType ?? 'caddy') === 'caddy'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >Caddy</button>
          <button
            @click="activeServer.serverType = 'nginx'; persist()"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeServer.serverType === 'nginx'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >Nginx</button>
        </div>
      </div>

      <!-- Hosts list -->
      <div v-if="!showForm">
        <div class="flex gap-2">
          <button
            @click="showForm = true"
            class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Plus class="w-4 h-4" />
            Add New Host
          </button>
        </div>

        <div v-if="activeHosts.length === 0" class="mt-8 text-center p-8 rounded-lg bg-card/50 border border-border/50">
          <p class="text-muted-foreground">No hosts configured yet. Add your first host to get started!</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <div
            v-for="host in activeHosts"
            :key="host.id"
            class="p-6 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
            style="background: linear-gradient(to bottom right, #6b3ce4, #9165f2); position: relative; overflow: hidden;"
          >
            <template v-if="host.presetName" v-for="preset in presets" :key="preset.name">
              <template v-if="preset.name === host.presetName && preset.logo">
                <div
                  class="absolute right-0 bottom-0 w-40 h-40 opacity-30 transform translate-x-10 translate-y-10 [&_*]:fill-white"
                  v-html="preset.logo"
                  style="max-width: 160px; max-height: 160px;"
                ></div>
              </template>
            </template>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <component :is="host.fileServer ? HardDrive : Server" class="w-5 h-5 text-white/80" />
                <a
                  v-if="!host.domain.startsWith(':')"
                  :href="`https://${host.domain}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-lg font-semibold text-white hover:text-white/90 transition-colors"
                >
                  <span class="text-white/50 mr-0.5">https://</span>{{ host.domain }}
                </a>
                <span v-else class="text-lg font-semibold text-white">{{ host.domain }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs px-2 py-0.5 rounded-full bg-white text-primary">
                {{ host.presetName || 'Custom' }}
              </span>
              <template v-if="host.presetName" v-for="preset in presets" :key="preset.name">
                <template v-if="preset.name === host.presetName">
                  <div class="flex gap-1">
                    <a
                      v-if="preset.webLink"
                      :href="preset.webLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-white/80 hover:text-white transition-colors"
                      :title="`Visit ${preset.name} website`"
                    >
                      <ExternalLink class="w-3 h-3" />
                    </a>
                    <a
                      v-if="preset.githubLink"
                      :href="preset.githubLink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-white/80 hover:text-white transition-colors"
                      :title="`View ${preset.name} on GitHub`"
                    >
                      <Github class="w-3 h-3" />
                    </a>
                  </div>
                </template>
              </template>
            </div>
            <p class="text-white/80 mb-4">
              <div class="flex items-center gap-2">
                <span>{{ host.fileServer ? 'File Server' : 'Reverse Proxy' }}</span>
                <div class="flex gap-1">
                  <Lock v-if="host.tls?.email || host.tls?.selfSigned" class="w-4 h-4" title="TLS Enabled" />
                  <Zap v-if="host.encode" class="w-4 h-4" title="Compression Enabled" />
                </div>
              </div>
              <span v-if="host.fileServer" class="block mt-1 text-sm">
                {{ host.fileServer.root }}
                <span v-if="host.fileServer.browse || host.fileServer.php || host.fileServer.frankenphp" class="text-white/60">
                  ({{ [
                    host.fileServer.browse ? 'Browse' : null,
                    host.fileServer.php ? 'PHP' : null,
                    host.fileServer.frankenphp ? 'FrankenPHP' : null,
                  ].filter(Boolean).join(', ') }})
                </span>
              </span>
              <span v-else class="block mt-1 text-sm text-white/60">{{ host.reverseProxy }}</span>
            </p>
            <div class="flex gap-2">
              <button
                @click="editHost(host)"
                class="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded p-1.5 transition-colors"
                title="Edit host"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                @click="deleteHost(host.id)"
                class="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded p-1.5 transition-colors"
                title="Delete host"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <CaddyConfig :hosts="activeHosts" :server-type="activeServer.serverType" v-if="activeHosts.length > 0" />
      </div>

      <HostForm
        v-else
        :initial-host="editingHost"
        :server-type="activeServer.serverType"
        @save="saveHost"
        @cancel="cancelEdit"
      />

      <ImportModal
        :show="showImportModal"
        @close="showImportModal = false"
        @import="importHosts"
      />
    </div>

    <footer class="py-8 border-t border-border/50">
      <div class="container">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div class="flex items-center gap-2">
            <a
              href="https://caddyserver.com"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-foreground transition-colors"
            >
              Caddy Server
            </a>
            <span>•</span>
            <a
              href="https://caddyserver.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-foreground transition-colors"
            >
              Caddy Documentation
            </a>
            <span>•</span>
            <a
              href="https://github.com/x2-Consulting/caddygen"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-foreground transition-colors"
            >
              <div class="flex items-center gap-1">
                <Github class="w-4 h-4" />
                <span>GitHub</span>
              </div>
            </a>
          </div>
          <div class="text-center md:text-right">
            <p>Made with ❤️ for the Caddy community</p>
            <p class="text-xs mt-1">Configurations are stored locally in your browser</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
