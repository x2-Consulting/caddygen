<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-yaml';
import { Download, Copy, AlertTriangle, XCircle, Check, RefreshCw, Settings2, X, Loader2, History, Trash2 } from 'lucide-vue-next';
import type { CaddyHost, CaddyGlobalOptions } from '../types/caddy';
import { validateHosts } from '../utils/validate';
import { generateNginxConfig } from '../utils/nginxGenerator';
import { generateCaddyConfig } from '../utils/caddyGenerator';
import { generateTraefikConfig } from '../utils/traefikGenerator';
import { isValidCaddyAdminUrl } from '../utils/sanitize';
import { useConfigHistory } from '../composables/useConfigHistory';

interface Props {
  hosts: CaddyHost[];
  serverType?: 'caddy' | 'nginx' | 'traefik';
  globalOptions?: CaddyGlobalOptions;
  serverId?: string;
  serverName?: string;
}

const props = defineProps<Props>();

const isNginx = computed(() => props.serverType === 'nginx');
const isTraefik = computed(() => props.serverType === 'traefik');
const language = computed(() => {
  if (isNginx.value) return 'nginx';
  if (isTraefik.value) return 'yaml';
  return 'caddy';
});
const filename = computed(() => {
  if (isNginx.value) return 'nginx.conf';
  if (isTraefik.value) return 'traefik-dynamic.yml';
  return 'Caddyfile';
});

// ── Prism setup ───────────────────────────────────────────────────────────────

onMounted(() => {
  if (!Prism.languages.caddy) {
    Prism.languages.caddy = {
      'quoted-string': { pattern: /"(?:\\.|[^"\\])*"/, alias: 'string' },
      'comment': { pattern: /#.*/, greedy: true },
      'directive': {
        pattern: /^\s*(root|file_server|reverse_proxy|encode|tls|basicauth|header|php_fastcgi|php_server|rate_limit|respond|remote_ip|hide|not|forward_auth|uri|copy_headers)\b/m,
        alias: 'keyword'
      },
      'block': {
        pattern: /{[\s\S]*?}/,
        inside: { 'punctuation': /[{}]/, 'content': { pattern: /[\s\S]+/, inside: Prism.languages.caddy } }
      },
      'variable': { pattern: /\{\{[^}]+\}\}/, alias: 'variable' },
      'matcher': { pattern: /@\w+/, alias: 'function' },
      'domain': { pattern: /^[^\s{]+/m, alias: 'string' },
      'path': { pattern: /(?<=\s)\/[^\s]*/, alias: 'string' },
      'url': { pattern: /https?:\/\/[^\s]*/, alias: 'string' },
      'email': { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, alias: 'string' },
      'wildcard': { pattern: /\*/, alias: 'operator' },
      'option': { pattern: /\b(browse|internal|gzip|brotli|zstd|br|php_fastcgi|php_server|uri|copy_headers)\b/, alias: 'property' },
      'number': { pattern: /\b\d+\b/, alias: 'number' },
      'time-unit': { pattern: /\b[smhd]\b/, alias: 'unit' },
      'ip-address': { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d{1,2})?\b/, alias: 'constant' },
      'punctuation': /[{}]/
    };
  }
  Prism.highlightAll();
});

watch(() => [props.hosts, props.serverType], () => {
  nextTick(() => Prism.highlightAll());
}, { deep: true });

// ── Output ────────────────────────────────────────────────────────────────────

const configOutput = computed(() => {
  if (isNginx.value) return generateNginxConfig(props.hosts);
  if (isTraefik.value) return generateTraefikConfig(props.hosts);
  return generateCaddyConfig(props.hosts, props.globalOptions);
});

// ── History ───────────────────────────────────────────────────────────────────

const { addSnapshot, getServerHistory, deleteSnapshot, clearServerHistory } = useConfigHistory();

const showHistory = ref(false);
const serverHistory = computed(() =>
  props.serverId ? getServerHistory(props.serverId) : []
);

function formatHistoryDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function restoreSnapshot(content: string) {
  // Trigger a download so user can save the historical config
  triggerDownload(content, filename.value);
  showHistory.value = false;
}

// ── Pending changes tracking ──────────────────────────────────────────────────

const lastActionedConfig = ref('');
const hasPendingChanges = computed(() =>
  lastActionedConfig.value !== '' && configOutput.value !== lastActionedConfig.value
);

function markActioned() {
  lastActionedConfig.value = configOutput.value;
  showReloadHint.value = true;
  // Record history snapshot on every intentional action
  if (props.serverId) {
    addSnapshot(
      props.serverId,
      props.serverName ?? 'Server',
      (props.serverType ?? 'caddy') as 'caddy' | 'nginx' | 'traefik',
      configOutput.value,
    );
  }
}

// ── Reload hint ───────────────────────────────────────────────────────────────

const showReloadHint = ref(false);

const reloadCommand = computed(() => {
  if (isNginx.value) {
    return { primary: 'sudo nginx -s reload', alt: 'sudo systemctl reload nginx' };
  }
  if (isTraefik.value) {
    return { primary: 'cp traefik-dynamic.yml /etc/traefik/dynamic/', alt: 'docker cp traefik-dynamic.yml traefik:/etc/traefik/dynamic/' };
  }
  return { primary: 'sudo systemctl reload caddy', alt: 'caddy reload --config /etc/caddy/Caddyfile' };
});

// ── File helpers ──────────────────────────────────────────────────────────────

function timestamp(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

function triggerDownload(content: string, name: string, mime = 'application/octet-stream') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadConfig() {
  triggerDownload(configOutput.value, filename.value);
  markActioned();
}

function copyConfig() {
  navigator.clipboard.writeText(configOutput.value);
  markActioned();
}

// ── Caddy Admin API ───────────────────────────────────────────────────────────

const showApiPanel = ref(false);
const apiUrl = ref(localStorage.getItem('caddyApiUrl') || 'http://localhost:2019');
type ApiStatus = 'idle' | 'loading' | 'success' | 'error';
const apiStatus = ref<ApiStatus>('idle');
const apiMessage = ref('');

watch(apiUrl, v => localStorage.setItem('caddyApiUrl', v));

async function applyToCaddy() {
  if (!isValidCaddyAdminUrl(apiUrl.value)) {
    apiStatus.value = 'error';
    apiMessage.value = 'Invalid admin URL. Only http(s)://localhost or 127.x.x.x addresses are allowed.';
    return;
  }
  apiStatus.value = 'loading';
  apiMessage.value = '';

  // 1. Backup the currently running config
  try {
    const backupRes = await fetch(`${apiUrl.value}/config/`);
    if (backupRes.ok) {
      const backupJson = await backupRes.text();
      triggerDownload(backupJson, `Caddyfile-backup_${timestamp()}.json`, 'application/json');
    }
  } catch {
    // Non-fatal — continue with apply even if backup fetch fails
  }

  // 2. Push new config
  try {
    const res = await fetch(`${apiUrl.value}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/caddyfile' },
      body: configOutput.value,
    });

    if (res.ok) {
      apiStatus.value = 'success';
      apiMessage.value = 'Config applied — Caddy reloaded successfully.';
      markActioned();
    } else {
      const text = await res.text();
      apiStatus.value = 'error';
      apiMessage.value = text || `Server responded with ${res.status}`;
    }
  } catch {
    apiStatus.value = 'error';
    apiMessage.value = 'Could not reach the Caddy admin API. Is it running and accessible?';
  }

  if (apiStatus.value !== 'error') {
    setTimeout(() => { apiStatus.value = 'idle'; apiMessage.value = ''; }, 4000);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

const validationIssues = computed(() => validateHosts(props.hosts));
</script>

<template>
  <div class="config-viewer">

    <!-- Validation issues -->
    <div v-if="validationIssues.length > 0" class="mb-4 space-y-2">
      <div
        v-for="(issue, i) in validationIssues"
        :key="i"
        :class="[
          'flex items-start gap-2 rounded-lg px-4 py-3 text-sm',
          issue.type === 'error'
            ? 'bg-destructive/10 border border-destructive/30 text-destructive'
            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
        ]"
      >
        <XCircle v-if="issue.type === 'error'" class="w-4 h-4 mt-0.5 shrink-0" />
        <AlertTriangle v-else class="w-4 h-4 mt-0.5 shrink-0" />
        <span><strong>{{ issue.domain }}</strong> — {{ issue.message }}</span>
      </div>
    </div>

    <!-- Action bar -->
    <div class="actions -mb-12 relative z-10 pr-4 pt-4" style="margin-bottom:-60px;">
      <div class="ml-auto flex items-center gap-2">
        <!-- Pending changes dot -->
        <span
          v-if="hasPendingChanges"
          class="inline-flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 font-medium"
        >
          <span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Unsaved changes
        </span>

        <span class="text-xs text-muted-foreground font-mono">{{ filename }}</span>

        <!-- History button -->
        <button
          v-if="serverHistory.length > 0"
          @click="showHistory = !showHistory"
          :class="[
            'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
            showHistory ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
          ]"
          :title="`Config history (${serverHistory.length})`"
        >
          <History class="w-4 h-4" />
        </button>

        <!-- Caddy API apply button (Caddy only) -->
        <button
          v-if="!isNginx && !isTraefik"
          @click="showApiPanel = !showApiPanel"
          :class="[
            'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
            showApiPanel ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
          ]"
          title="Caddy Admin API settings"
        >
          <Settings2 class="w-4 h-4" />
        </button>

        <button
          @click="downloadConfig"
          class="relative inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg p-2 transition-colors"
          :title="`Download ${filename}`"
        >
          <Download class="w-5 h-5" />
          <span v-if="hasPendingChanges" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-slate-900"></span>
        </button>

        <button
          @click="copyConfig"
          class="relative inline-flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg p-2 transition-colors"
          title="Copy to Clipboard"
        >
          <Copy class="w-5 h-5" />
          <span v-if="hasPendingChanges" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-slate-900"></span>
        </button>
      </div>
    </div>

    <!-- Config output -->
    <pre class="rounded-lg p-4 pt-16 bg-slate-900"><code :class="`language-${language}`">{{ configOutput }}</code></pre>

    <!-- Caddy Admin API panel -->
    <div v-if="showApiPanel && !isNginx && !isTraefik" class="mt-3 rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Apply via Caddy Admin API</p>
        <button @click="showApiPanel = false" class="text-muted-foreground hover:text-foreground">
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-xs text-muted-foreground">
        Pushes the config directly to a running Caddy instance with zero downtime.
        The current running config will be downloaded as a backup first.
      </p>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="apiUrl"
          class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
          placeholder="http://localhost:2019"
        />
        <button
          @click="applyToCaddy"
          :disabled="apiStatus === 'loading'"
          class="inline-flex items-center justify-center gap-2 px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-lg transition-colors"
        >
          <Loader2 v-if="apiStatus === 'loading'" class="w-4 h-4 animate-spin" />
          <RefreshCw v-else class="w-4 h-4" />
          {{ apiStatus === 'loading' ? 'Applying…' : 'Apply & Reload' }}
        </button>
      </div>
      <!-- API feedback -->
      <div
        v-if="apiMessage"
        :class="[
          'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
          apiStatus === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400'
            : 'bg-destructive/10 border border-destructive/30 text-destructive'
        ]"
      >
        <Check v-if="apiStatus === 'success'" class="w-4 h-4 mt-0.5 shrink-0" />
        <XCircle v-else class="w-4 h-4 mt-0.5 shrink-0" />
        {{ apiMessage }}
      </div>
    </div>

    <!-- Reload hint banner -->
    <div
      v-if="showReloadHint"
      class="mt-3 flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-card px-4 py-3 text-sm"
    >
      <div class="space-y-1">
        <p class="font-medium text-foreground">Reload your server to apply changes</p>
        <div class="flex flex-wrap gap-2 font-mono text-xs">
          <code class="rounded bg-muted px-2 py-1 text-muted-foreground">{{ reloadCommand.primary }}</code>
          <span class="text-muted-foreground self-center">or</span>
          <code class="rounded bg-muted px-2 py-1 text-muted-foreground">{{ reloadCommand.alt }}</code>
        </div>
      </div>
      <button @click="showReloadHint = false" class="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Config history panel -->
    <div v-if="showHistory" class="mt-3 rounded-lg border border-border/50 bg-card overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div class="flex items-center gap-2 text-sm font-medium">
          <History class="w-4 h-4 text-primary" />
          Config history
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="serverHistory.length > 0 && props.serverId"
            @click="clearServerHistory(props.serverId!)"
            class="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >Clear all</button>
          <button @click="showHistory = false" class="text-muted-foreground hover:text-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="max-h-64 overflow-y-auto divide-y divide-border/30">
        <div
          v-for="snapshot in serverHistory"
          :key="snapshot.id"
          class="flex items-center justify-between px-4 py-2.5 hover:bg-accent/30 transition-colors"
        >
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ formatHistoryDate(snapshot.savedAt) }}</p>
            <p class="text-xs font-mono text-foreground/60 truncate max-w-xs mt-0.5">
              {{ snapshot.content.slice(0, 80).replace(/\n/g, ' ') }}…
            </p>
          </div>
          <div class="flex items-center gap-1 ml-3 flex-shrink-0">
            <button
              @click="restoreSnapshot(snapshot.content)"
              class="inline-flex items-center gap-1 text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
              title="Download this snapshot"
            >
              <Download class="w-3 h-3" />
              Download
            </button>
            <button
              @click="deleteSnapshot(snapshot.id)"
              class="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete entry"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.config-viewer {
  margin: 2rem 0;
  text-align: left;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

pre code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
  line-height: 1.5;
}
</style>
