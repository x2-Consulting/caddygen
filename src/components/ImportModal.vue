<script setup lang="ts">
import { ref } from 'vue';
import { X, Upload } from 'lucide-vue-next';
import type { CaddyHost } from '../types/caddy';
import { v4 as uuidv4 } from 'uuid';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  import: [hosts: CaddyHost[]];
}>();

const configContent = ref('');
const configType = ref<'caddy' | 'nginx'>('caddy');

// ---------------------------------------------------------------------------
// Caddy parser — improved with brace-depth splitting, global options skip,
// multi-domain support, handle/route flattening, and richer directive extraction
// ---------------------------------------------------------------------------

/** Split a Caddyfile into top-level site blocks using a brace-depth counter. */
function splitCaddyBlocks(content: string): Array<{ header: string; body: string[] }> {
  const result: Array<{ header: string; body: string[] }> = [];
  const lines = content.split('\n');
  let depth = 0;
  let header = '';
  let bodyLines: string[] = [];
  let inBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (!inBlock) {
      // Opening: either "domain {" on one line or "domain" followed by "{" on next
      if (line.endsWith('{')) {
        header = line.slice(0, -1).trim();
        inBlock = true;
        depth = 1;
        bodyLines = [];
      } else if (line === '{') {
        // standalone brace — global options block or continuation
        inBlock = true;
        depth = 1;
        bodyLines = [];
        // header stays as whatever was set by a previous non-brace line
      } else {
        // bare line before a block (header on its own line)
        header = line;
      }
    } else {
      // Count braces to track depth
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0) {
        result.push({ header, body: bodyLines });
        header = '';
        bodyLines = [];
        inBlock = false;
      } else {
        bodyLines.push(line);
      }
    }
  }
  return result;
}

/**
 * Flatten nested handle/route blocks: collect all directives regardless of depth,
 * stripping the wrapper lines (handle, route, @matchers, lone braces).
 */
function flattenDirectives(lines: string[]): string[] {
  const flat: string[] = [];
  let depth = 0;
  for (const line of lines) {
    // Skip matcher definitions, handle/route headers, lone braces
    if (/^@\w+/.test(line)) continue;
    if (/^(handle|route)(\s|$)/.test(line) || /^handle_path\s/.test(line)) {
      if (line.endsWith('{')) { depth++; continue; }
    }
    if (line === '{') { depth++; continue; }
    if (line === '}') { depth--; continue; }
    // Count inner braces on non-skipped lines
    let opens = 0, closes = 0;
    for (const ch of line) { if (ch === '{') opens++; else if (ch === '}') closes++; }
    // If line itself opens a block (e.g. "header { ... }"), collect it but don't flatten further
    flat.push(line);
  }
  return flat;
}

function parseCaddyfile(content: string): CaddyHost[] {
  const hosts: CaddyHost[] = [];
  const blocks = splitCaddyBlocks(content);

  for (const block of blocks) {
    const { header, body } = block;

    // Skip global options block (empty header = standalone `{` block)
    if (!header) continue;

    // Skip snippet definitions: (snippet-name) { ... }
    if (header.startsWith('(') && header.endsWith(')')) continue;

    // Domains: split on whitespace (Caddy allows space-separated site addresses)
    const addresses = header.split(/\s+/).filter(Boolean);
    // Use first address as the canonical domain
    const domain = addresses[0];
    if (!domain || domain === '{') continue;

    const host: CaddyHost = { id: uuidv4(), domain, encode: false };

    // Flatten directives — collapses handle/route blocks
    const directives = flattenDirectives(body);

    for (let i = 0; i < directives.length; i++) {
      const line = directives[i];
      if (!line) continue;

      if (line.startsWith('root ')) {
        // "root * /path" or "root /path"
        const parts = line.split(/\s+/);
        const root = parts[parts.length - 1];
        if (!host.fileServer) {
          host.fileServer = { root, browse: false, php: false, frankenphp: false, hide: [] };
        } else {
          host.fileServer.root = root;
        }
      } else if (line.startsWith('file_server')) {
        if (!host.fileServer) {
          host.fileServer = { root: '/', browse: line.includes('browse'), php: false, frankenphp: false, hide: [] };
        } else {
          host.fileServer.browse = line.includes('browse');
        }
      } else if (line.startsWith('reverse_proxy')) {
        host.reverseProxy = line.split(/\s+/).slice(1).join(' ');
      } else if (line.startsWith('encode')) {
        host.encode = true;
      } else if (line.startsWith('tls')) {
        const parts = line.split(/\s+/);
        const arg = parts[1];
        if (!arg || arg === '{') {
          // bare "tls" with a block — leave as empty tls
          host.tls = {};
        } else if (arg === 'internal') {
          host.tls = { selfSigned: true };
        } else if (arg.includes('@') || arg.includes('.')) {
          // looks like an email
          host.tls = { email: arg };
        } else {
          // Could be cert path — look for key on next arg
          const certFile = arg;
          const keyFile = parts[2] ?? '';
          host.tls = { certFile, keyFile };
        }
      } else if (line.startsWith('basicauth')) {
        // basicauth block — just mark it as present; credentials aren't importable
        if (!host.basicAuth) host.basicAuth = [];
        host.basicAuth.push({ username: '<imported>', password: '' });
      } else if (line.startsWith('header ')) {
        // "header <name> <value>" or "header >name value" (add/set)
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          let name = parts[1].replace(/^[+>!?]/, '');
          const value = parts.slice(2).join(' ').replace(/^"(.*)"$/, '$1');
          if (name && value && !/^\{/.test(value)) {
            if (!host.headers) host.headers = [];
            host.headers.push({ name, value });
          }
        }
      } else if (line.startsWith('cors') || line.startsWith('@cors')) {
        // minimal: just enable cors placeholder
        if (!host.cors) {
          host.cors = { enabled: true, allowOrigins: [], allowMethods: [], allowHeaders: [] };
        }
      } else if (line.startsWith('rate_limit') || line.startsWith('rate-limit')) {
        if (!host.security) {
          host.security = {
            ipFilter: { enabled: false, allow: [], block: [] },
            rateLimit: { enabled: true, requests: 100, window: '1m' },
            cspEnabled: false, csp: '',
            forwardAuth: { enabled: false, url: '', verifyHeader: '', verifyValue: '' },
          };
        } else {
          host.security.rateLimit = { enabled: true, requests: 100, window: '1m' };
        }
      } else if (line.startsWith('forward_auth')) {
        const urlPart = line.split(/\s+/)[1] ?? '';
        if (!host.security) {
          host.security = {
            ipFilter: { enabled: false, allow: [], block: [] },
            rateLimit: { enabled: false, requests: 100, window: '1m' },
            cspEnabled: false, csp: '',
            forwardAuth: { enabled: true, url: urlPart, verifyHeader: '', verifyValue: '' },
          };
        } else {
          host.security.forwardAuth = { enabled: true, url: urlPart, verifyHeader: '', verifyValue: '' };
        }
      } else if (/^(php_fastcgi|frankenphp)/.test(line)) {
        if (!host.fileServer) {
          host.fileServer = { root: '/', browse: false, php: true, frankenphp: line.startsWith('frankenphp'), hide: [] };
        } else {
          host.fileServer.php = true;
          if (line.startsWith('frankenphp')) host.fileServer.frankenphp = true;
        }
      }
    }

    hosts.push(host);
  }

  return hosts;
}

// ---------------------------------------------------------------------------
// Nginx parser
// ---------------------------------------------------------------------------
function parseNginxConfig(content: string): CaddyHost[] {
  const hosts: CaddyHost[] = [];

  // Extract top-level server { } blocks (handles nested braces)
  const serverBlocks: string[] = [];
  let depth = 0;
  let blockStart = -1;
  let inBlock = false;

  const lines = content.split('\n');
  const blockLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!inBlock) {
      if (line === 'server {' || line === 'server{') {
        inBlock = true;
        depth = 1;
        blockStart = blockLines.length;
        blockLines.push(line);
      }
    } else {
      blockLines.push(line);
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0) {
        serverBlocks.push(blockLines.slice(blockStart).join('\n'));
        blockLines.length = 0;
        inBlock = false;
      }
    }
  }

  for (const block of serverBlocks) {
    const bLines = block.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    // Skip HTTP-only redirect blocks (contain return 301 https:// but no ssl)
    const hasSslOrNoRedirect = bLines.some(l => l.startsWith('ssl_certificate') || l.startsWith('listen 443'));
    const isRedirectOnly = !hasSslOrNoRedirect && bLines.some(l => /return\s+30[12]\s+https/.test(l));
    if (isRedirectOnly) continue;

    // server_name
    const serverNameLine = bLines.find(l => l.startsWith('server_name '));
    if (!serverNameLine) continue;
    const domain = serverNameLine.replace('server_name', '').replace(';', '').trim().split(/\s+/)[0];
    if (!domain || domain === '_') continue;

    const host: CaddyHost = { id: uuidv4(), domain, encode: false };

    // TLS
    const certLine = bLines.find(l => l.startsWith('ssl_certificate ') && !l.includes('_key'));
    const keyLine = bLines.find(l => l.startsWith('ssl_certificate_key '));
    if (certLine || keyLine) {
      const certPath = certLine?.replace('ssl_certificate', '').replace(';', '').trim() ?? '';
      const keyPath = keyLine?.replace('ssl_certificate_key', '').replace(';', '').trim() ?? '';
      // Detect Let's Encrypt managed paths
      if (certPath.includes('/letsencrypt/') || certPath.includes('/certbot/')) {
        host.tls = { email: '' };
      } else {
        host.tls = { certFile: certPath, keyFile: keyPath };
      }
    }

    // gzip
    if (bLines.some(l => l === 'gzip on;')) {
      host.encode = true;
    }

    // CSP from add_header
    const cspLine = bLines.find(l => /add_header\s+Content-Security-Policy/i.test(l));
    if (cspLine) {
      const m = cspLine.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/i);
      if (m) {
        host.security = {
          ipFilter: { enabled: false, allow: [], block: [] },
          rateLimit: { enabled: false, requests: 100, window: '1m' },
          cspEnabled: true,
          csp: m[1],
          forwardAuth: { enabled: false, url: '', verifyHeader: '', verifyValue: '' },
        };
      }
    }

    // Custom headers (add_header that aren't CORS/CSP/security boilerplate)
    const knownHeaders = new Set(['Content-Security-Policy', 'X-Frame-Options', 'X-XSS-Protection',
      'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy',
      'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers', 'Strict-Transport-Security', 'Cache-Control']);
    const customHeaders: { name: string; value: string }[] = [];
    for (const l of bLines) {
      if (!l.startsWith('add_header ')) continue;
      const m = l.match(/^add_header\s+(\S+)\s+"([^"]+)"/);
      if (!m) continue;
      if (knownHeaders.has(m[1])) continue;
      customHeaders.push({ name: m[1], value: m[2] });
    }
    if (customHeaders.length) host.headers = customHeaders;

    // Cache-Control header
    const ccLine = bLines.find(l => /add_header\s+Cache-Control/i.test(l));
    if (ccLine) {
      const m = ccLine.match(/add_header\s+Cache-Control\s+"([^"]+)"/i);
      if (m) {
        host.performance = { brotli: false, cacheControlEnabled: true, cacheControl: m[1] };
      }
    }

    // CORS
    const corsOriginLine = bLines.find(l => /add_header\s+Access-Control-Allow-Origin/i.test(l));
    if (corsOriginLine) {
      const m = corsOriginLine.match(/add_header\s+Access-Control-Allow-Origin\s+"([^"]+)"/i);
      const methodLine = bLines.find(l => /add_header\s+Access-Control-Allow-Methods/i.test(l));
      const headerLine = bLines.find(l => /add_header\s+Access-Control-Allow-Headers/i.test(l));
      host.cors = {
        enabled: true,
        allowOrigins: m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [],
        allowMethods: methodLine ? (methodLine.match(/"([^"]+)"/) ?? [])[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? [] : [],
        allowHeaders: headerLine ? (headerLine.match(/"([^"]+)"/) ?? [])[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? [] : [],
      };
    }

    // IP allow/deny
    const allowLines = bLines.filter(l => /^allow\s/.test(l)).map(l => l.replace('allow', '').replace(';', '').trim());
    const denyLines = bLines.filter(l => /^deny\s/.test(l) && !/deny all/.test(l)).map(l => l.replace('deny', '').replace(';', '').trim());
    if (allowLines.length || denyLines.length) {
      if (!host.security) {
        host.security = {
          ipFilter: { enabled: true, allow: allowLines, block: denyLines },
          rateLimit: { enabled: false, requests: 100, window: '1m' },
          cspEnabled: false, csp: '',
          forwardAuth: { enabled: false, url: '', verifyHeader: '', verifyValue: '' },
        };
      } else {
        host.security.ipFilter = { enabled: true, allow: allowLines, block: denyLines };
      }
    }

    // location / block — proxy_pass or file server
    // Collect location blocks at depth 1 inside the server block
    let locDepth = 0;
    let inLoc = false;
    let locLines: string[] = [];
    for (const bl of bLines) {
      if (!inLoc && /^location\s+[^\s]+\s*\{/.test(bl)) {
        inLoc = true;
        locDepth = 1;
        locLines = [bl];
        continue;
      }
      if (inLoc) {
        locLines.push(bl);
        for (const ch of bl) {
          if (ch === '{') locDepth++;
          else if (ch === '}') locDepth--;
        }
        if (locDepth === 0) {
          // Determine if this is the root location
          const isRoot = /^location\s+\/\s*\{/.test(locLines[0]);
          const isPhp = /^location\s+~\s+\\\.php/.test(locLines[0]);

          if (isRoot) {
            const proxyLine = locLines.find(l => l.startsWith('proxy_pass '));
            if (proxyLine) {
              host.reverseProxy = proxyLine.replace('proxy_pass', '').replace(';', '').trim();
            }
            const rootLine = locLines.find(l => l.startsWith('root '));
            if (rootLine && !host.reverseProxy) {
              const root = rootLine.replace('root', '').replace(';', '').trim();
              host.fileServer = { root, browse: locLines.some(l => l === 'autoindex on;'), php: false, frankenphp: false, hide: [] };
            }
          }

          if (isPhp && host.fileServer) {
            host.fileServer.php = true;
          }

          inLoc = false;
          locLines = [];
        }
      }
    }

    hosts.push(host);
  }

  return hosts;
}

function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { configContent.value = e.target?.result as string; };
  reader.readAsText(file);
}

function importConfig() {
  const hosts = configType.value === 'nginx'
    ? parseNginxConfig(configContent.value)
    : parseCaddyfile(configContent.value);
  emit('import', hosts);
  emit('close');
  configContent.value = '';
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="emit('close')" />

    <!-- Modal -->
    <div class="relative bg-card border border-border/50 rounded-lg shadow-lg w-full max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-border/50">
        <h2 class="text-xl font-semibold">Import Config</h2>
        <button @click="emit('close')" class="text-muted-foreground hover:text-foreground">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <!-- Type toggle -->
        <div class="flex gap-2">
          <button
            type="button"
            :class="['type-pill', configType === 'caddy' ? 'active' : '']"
            @click="configType = 'caddy'"
          >Caddyfile</button>
          <button
            type="button"
            :class="['type-pill', configType === 'nginx' ? 'active' : '']"
            @click="configType = 'nginx'"
          >nginx.conf</button>
        </div>

        <div>
          <label class="block mb-2">Paste your {{ configType === 'nginx' ? 'nginx.conf' : 'Caddyfile' }} content:</label>
          <textarea
            v-model="configContent"
            class="w-full h-48 p-4 bg-muted rounded-lg font-mono text-sm"
            :placeholder="configType === 'nginx' ? 'server {\n    listen 443 ssl;\n    server_name example.com;\n    location / {\n        proxy_pass http://localhost:3000;\n    }\n}' : 'example.com {\n    reverse_proxy localhost:3000\n}'"
          ></textarea>
        </div>

        <div class="text-center">
          <span class="text-muted-foreground">or</span>
        </div>

        <div class="flex items-center justify-center">
          <label class="relative cursor-pointer bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg px-4 py-2 transition-colors">
            <input
              type="file"
              accept="*"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              @change="handleFileUpload"
            />
            <div class="flex items-center gap-2">
              <Upload class="w-4 h-4" />
              Upload {{ configType === 'nginx' ? 'nginx.conf' : 'Caddyfile' }}
            </div>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 p-6 border-t border-border/50 bg-muted/50">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="importConfig"
          class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          :disabled="!configContent"
        >
          Import
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-pill {
  padding: 0.35rem 1rem;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: transparent;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.type-pill:hover {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}
.type-pill.active {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
</style>
