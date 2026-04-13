<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-nginx';
import { Download, Copy, AlertTriangle, XCircle, Check, RefreshCw, Settings2, X, Loader2 } from 'lucide-vue-next';
import type { CaddyHost } from '../types/caddy';
import { validateHosts } from '../utils/validate';
import { generateNginxConfig } from '../utils/nginxGenerator';
import { generateCaddyConfig } from '../utils/caddyGenerator';

interface Props {
  hosts: CaddyHost[];
  serverType?: 'caddy' | 'nginx';
}

const props = defineProps<Props>();

const isNginx = computed(() => props.serverType === 'nginx');
const language = computed(() => isNginx.value ? 'nginx' : 'caddy');
const filename = computed(() => isNginx.value ? 'nginx.conf' : 'Caddyfile');

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

const configOutput = computed(() =>
  isNginx.value ? generateNginxConfig(props.hosts) : generateCaddyConfig(props.hosts)
);

// ── Pending changes tracking ──────────────────────────────────────────────────

const lastActionedConfig = ref('');
const hasPendingChanges = computed(() =>
  lastActionedConfig.value !== '' && configOutput.value !== lastActionedConfig.value
);

function markActioned() {
  lastActionedConfig.value = configOutput.value;
  showReloadHint.value = true;
}

// ── Reload hint ───────────────────────────────────────────────────────────────

const showReloadHint = ref(false);

const reloadCommand = computed(() => {
  if (isNginx.value) {
    return { primary: 'sudo nginx -s reload', alt: 'sudo systemctl reload nginx' };
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

        <!-- Caddy API apply button (Caddy only) -->
        <button
          v-if="!isNginx"
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
    <div v-if="showApiPanel && !isNginx" class="mt-3 rounded-lg border border-border/50 bg-card p-4 space-y-3">
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
      <div class="flex gap-2">
        <input
          v-model="apiUrl"
          class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
          placeholder="http://localhost:2019"
        />
        <button
          @click="applyToCaddy"
          :disabled="apiStatus === 'loading'"
          class="inline-flex items-center gap-2 px-4 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-lg transition-colors"
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
