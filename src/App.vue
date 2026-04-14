<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Pencil, Trash2, Server, HardDrive, Lock, Zap, Github, ExternalLink, Settings, Settings2, ChevronDown, ChevronUp, Upload, Sun, Moon, Share2, Check, X, Download, Layers } from 'lucide-vue-next';
import type { CaddyHost, CaddyServer } from './types/caddy';
import { presets } from './presets';
import { v4 as uuidv4 } from 'uuid';
import HostForm from './components/HostForm.vue';
import CaddyConfig from './components/CaddyConfig.vue';
import ImportModal from './components/ImportModal.vue';
import TemplateModal from './components/TemplateModal.vue';
import { useTemplates } from './composables/useTemplates';
import type { HostTemplate } from './composables/useTemplates';
import LZString from 'lz-string';
import { strToU8, zip } from 'fflate';
import DOMPurify from 'dompurify';
import { generateCaddyConfig } from './utils/caddyGenerator';
import { generateNginxConfig } from './utils/nginxGenerator';
import { generateTraefikConfig } from './utils/traefikGenerator';

// ── Schema validation for imported configs ───────────────────────────────────

function isValidHost(obj: unknown): obj is CaddyHost {
  if (!obj || typeof obj !== 'object') return false;
  const h = obj as Record<string, unknown>;
  return typeof h.id === 'string' && typeof h.domain === 'string';
}

function isValidServer(obj: unknown): obj is CaddyServer {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    Array.isArray(s.hosts) &&
    (s.hosts as unknown[]).every(isValidHost)
  );
}

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
const showTemplateModal = ref(false);

const { templates, applyTemplate } = useTemplates();

function addHostFromTemplate(template: HostTemplate) {
  const config = applyTemplate(template);
  editingHost.value = { id: uuidv4(), domain: '', ...config };
  showForm.value = true;
}

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

// ── Global options ───────────────────────────────────────────────────────────

const showGlobalOptions = ref(false);

function ensureGlobalOptions() {
  if (!activeServer.value.globalOptions) {
    activeServer.value.globalOptions = {};
  }
  return activeServer.value.globalOptions;
}

// ── Export all ───────────────────────────────────────────────────────────────

function exportAllServers() {
  const files: Record<string, Uint8Array> = {};
  for (const server of servers.value) {
    if (!server.hosts.length) continue;
    const safeName = server.name.replace(/[^a-z0-9_-]/gi, '_');
    let content: string;
    let filename: string;
    if (server.serverType === 'nginx') {
      content = generateNginxConfig(server.hosts);
      filename = `${safeName}.nginx.conf`;
    } else if (server.serverType === 'traefik') {
      content = generateTraefikConfig(server.hosts);
      filename = `${safeName}.traefik-dynamic.yml`;
    } else {
      content = generateCaddyConfig(server.hosts, server.globalOptions);
      filename = `${safeName}.Caddyfile`;
    }
    files[filename] = strToU8(content);
  }
  if (!Object.keys(files).length) return;
  zip(files, (err, data) => {
    if (err) return;
    const blob = new Blob([data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caddygen-configs.zip';
    a.click();
    URL.revokeObjectURL(url);
  });
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
          if (parsed.every(isValidServer)) {
            servers.value = parsed as CaddyServer[];
          }
        } else if (Array.isArray(parsed)) {
          const validHosts = (parsed as unknown[]).filter(isValidHost) as CaddyHost[];
          if (validHosts.length) {
            servers.value = [makeServer('Imported', validHosts)];
          }
        }
        activeServerId.value = servers.value[0].id;
        persist();
      }
    } catch (e) {
      console.warn('Failed to load config from URL parameter:', e);
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
    <div class="container py-4 sm:py-8 flex-1">

      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-border/50">
        <h1 class="flex items-center gap-3">
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <Settings class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div class="flex flex-col">
            <span class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">CaddyGen</span>
            <span class="text-xs sm:text-sm font-normal text-muted-foreground">Caddy &amp; Nginx Config Generator</span>
          </div>
        </h1>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            @click="showImportModal = true"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg px-3 py-2 text-sm transition-colors"
            title="Import config"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            @click="exportAllServers"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg px-3 py-2 text-sm transition-colors"
            title="Download all server configs as a zip"
          >
            <Download class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Export All</span>
          </button>
          <button
            @click="shareConfig"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg px-3 py-2 text-sm transition-colors"
            title="Copy shareable link to clipboard"
          >
            <Check v-if="shareCopied" class="w-3.5 h-3.5 text-green-500" />
            <Share2 v-else class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ shareCopied ? 'Copied!' : 'Share' }}</span>
          </button>
          <div class="w-px h-6 bg-border/60 mx-0.5"></div>
          <button
            @click="toggleDark"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Sun v-if="isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="mb-6">
        <button
          class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          @click="toggleDescription"
        >
          <component :is="showDescription ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
          <span>About CaddyGen</span>
        </button>
        <div
          v-if="showDescription"
          class="mt-2 text-sm text-muted-foreground space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 max-w-2xl"
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
      <div class="flex items-center gap-1 mb-6 flex-wrap border-b border-border/50 pb-2 gap-y-2">
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
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeServerId === server.id
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
            ]"
            title="Double-click to rename"
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
          class="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-dashed border-border/60 hover:border-border transition-all"
          title="Add new server"
        >
          <Plus class="w-3.5 h-3.5" />
          New Server
        </button>

        <!-- Server type toggle for active server -->
        <div class="ml-auto flex items-center rounded-lg bg-secondary/50 border border-border/50 p-0.5 gap-0.5">
          <button
            @click="activeServer.serverType = 'caddy'; persist()"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              (activeServer.serverType ?? 'caddy') === 'caddy'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >Caddy</button>
          <button
            @click="activeServer.serverType = 'nginx'; persist()"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              activeServer.serverType === 'nginx'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >Nginx</button>
          <button
            @click="activeServer.serverType = 'traefik'; persist()"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              activeServer.serverType === 'traefik'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >Traefik</button>
        </div>
      </div>

      <!-- Global Caddy Options -->
      <div v-if="!showForm && (activeServer.serverType ?? 'caddy') === 'caddy'" class="mb-4">
        <button
          type="button"
          @click="showGlobalOptions = !showGlobalOptions"
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 class="w-4 h-4" />
          Global Caddy Options
          <component :is="showGlobalOptions ? ChevronUp : ChevronDown" class="w-3 h-3" />
        </button>
        <div v-if="showGlobalOptions" class="mt-3 p-4 rounded-lg border border-border/50 bg-card space-y-3 max-w-xl">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-muted-foreground mb-1">ACME Email</label>
              <input
                :value="activeServer.globalOptions?.email ?? ''"
                @input="ensureGlobalOptions().email = ($event.target as HTMLInputElement).value; persist()"
                type="email"
                placeholder="admin@example.com"
                class="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <label class="block text-xs text-muted-foreground mb-1">Admin Endpoint</label>
              <input
                :value="activeServer.globalOptions?.admin ?? ''"
                @input="ensureGlobalOptions().admin = ($event.target as HTMLInputElement).value; persist()"
                placeholder="localhost:2019 or off"
                class="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-muted-foreground mb-1">Custom ACME CA URL</label>
            <input
              :value="activeServer.globalOptions?.acmeCa ?? ''"
              @input="ensureGlobalOptions().acmeCa = ($event.target as HTMLInputElement).value; persist()"
              placeholder="https://acme.zerossl.com/v2/DV90"
              class="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground"
            />
          </div>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              :checked="activeServer.globalOptions?.debug ?? false"
              @change="ensureGlobalOptions().debug = ($event.target as HTMLInputElement).checked; persist()"
              class="rounded border-border"
            />
            Enable debug logging
          </label>
        </div>
      </div>

      <!-- Hosts list -->
      <div v-if="!showForm">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            @click="showForm = true; editingHost = undefined"
            class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm shadow-primary/20 transition-all hover:shadow-primary/30 hover:-translate-y-px"
          >
            <Plus class="w-4 h-4" />
            Add New Host
          </button>
          <button
            v-if="templates.length > 0"
            @click="showTemplateModal = true"
            class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Layers class="w-4 h-4" />
            From Template
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="activeHosts.length === 0" class="mt-8 text-center py-16 px-8 rounded-2xl border border-dashed border-border bg-card/30">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Server class="w-7 h-7 text-primary" />
          </div>
          <h3 class="text-base font-semibold mb-1.5">No hosts configured</h3>
          <p class="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">Add your first host to get started, or load an existing configuration using the Caddy Admin API panel below.</p>
          <button
            @click="showForm = true; editingHost = undefined"
            class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus class="w-4 h-4" />
            Add New Host
          </button>
        </div>

        <!-- Host cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div
            v-for="host in activeHosts"
            :key="host.id"
            class="relative flex flex-col p-5 rounded-2xl border border-white/10 overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            style="background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 60%, #9165f2 100%);"
          >
            <!-- Preset logo watermark -->
            <template v-if="host.presetName" v-for="preset in presets" :key="preset.name">
              <template v-if="preset.name === host.presetName && preset.logo">
                <div
                  class="absolute right-0 bottom-0 w-36 h-36 opacity-[0.15] transform translate-x-8 translate-y-8 [&_*]:fill-white pointer-events-none"
                  v-html="DOMPurify.sanitize(preset.logo, { USE_PROFILES: { svg: true } })"
                ></div>
              </template>
            </template>

            <!-- Domain row -->
            <div class="flex items-start gap-2 mb-3">
              <div class="mt-0.5 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <component :is="host.fileServer ? HardDrive : Server" class="w-4 h-4 text-white/90" />
              </div>
              <div class="min-w-0 flex-1">
                <a
                  v-if="!host.domain.startsWith(':')"
                  :href="`https://${host.domain}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block text-sm font-semibold text-white hover:text-white/90 transition-colors truncate leading-tight"
                  :title="host.domain"
                >{{ host.domain }}</a>
                <span v-else class="block text-sm font-semibold text-white truncate leading-tight">{{ host.domain }}</span>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="text-xs px-1.5 py-0.5 rounded-md bg-white/15 text-white/90 font-medium">
                    {{ host.presetName || 'Custom' }}
                  </span>
                  <template v-if="host.presetName" v-for="preset in presets" :key="preset.name">
                    <template v-if="preset.name === host.presetName">
                      <a v-if="preset.webLink" :href="preset.webLink" target="_blank" rel="noopener noreferrer" class="text-white/60 hover:text-white/90 transition-colors" :title="`Visit ${preset.name} website`">
                        <ExternalLink class="w-3 h-3" />
                      </a>
                      <a v-if="preset.githubLink" :href="preset.githubLink" target="_blank" rel="noopener noreferrer" class="text-white/60 hover:text-white/90 transition-colors" :title="`View ${preset.name} on GitHub`">
                        <Github class="w-3 h-3" />
                      </a>
                    </template>
                  </template>
                </div>
              </div>
            </div>

            <!-- Description (flex-1 pushes buttons to bottom) -->
            <div class="flex-1 text-white/75 text-sm mb-3">
              <div class="flex items-center gap-1.5">
                <span>{{ host.fileServer ? 'File Server' : 'Reverse Proxy' }}</span>
                <Lock v-if="host.tls?.email || host.tls?.selfSigned" class="w-3.5 h-3.5 text-white/60" title="TLS Enabled" />
                <Zap v-if="host.encode" class="w-3.5 h-3.5 text-white/60" title="Compression Enabled" />
              </div>
              <span v-if="host.fileServer" class="block mt-0.5 text-xs text-white/55 truncate">
                {{ host.fileServer.root }}
                <span v-if="host.fileServer.browse || host.fileServer.php || host.fileServer.frankenphp">
                  ({{ [host.fileServer.browse ? 'Browse' : null, host.fileServer.php ? 'PHP' : null, host.fileServer.frankenphp ? 'FrankenPHP' : null].filter(Boolean).join(', ') }})
                </span>
              </span>
              <span v-else class="block mt-0.5 text-xs text-white/55 truncate">{{ host.reverseProxy }}</span>
            </div>

            <!-- Actions — always pinned to the bottom -->
            <div class="flex gap-2 pt-3 border-t border-white/10 mt-auto">
              <button
                @click="editHost(host)"
                class="inline-flex items-center gap-1.5 flex-1 justify-center bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                title="Edit host"
              >
                <Pencil class="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                @click="deleteHost(host.id)"
                class="inline-flex items-center gap-1.5 justify-center bg-white/10 hover:bg-red-500/50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                title="Delete host"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <CaddyConfig
          :hosts="activeHosts"
          :server-type="activeServer.serverType"
          :global-options="activeServer.globalOptions"
          :server-id="activeServer.id"
          :server-name="activeServer.name"
          @load-hosts="importHosts"
        />
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

      <TemplateModal
        :show="showTemplateModal"
        @close="showTemplateModal = false"
        @select="addHostFromTemplate"
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
