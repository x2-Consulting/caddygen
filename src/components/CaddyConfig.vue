<script setup lang="ts">
import { computed, onMounted, watch, nextTick } from 'vue';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { Download, Copy, AlertTriangle, XCircle } from 'lucide-vue-next';
import type { CaddyHost } from '../types/caddy';
import { validateHosts } from '../utils/validate';

interface Props {
  hosts: CaddyHost[];
}

const props = defineProps<Props>();

onMounted(() => {
  if (!Prism.languages.caddy) {
    Prism.languages.caddy = {
      'quoted-string': {
        pattern: /"(?:\\.|[^"\\])*"/,
        alias: 'string'
      },
      'comment': {
        pattern: /#.*/,
        greedy: true
      },
      'directive': {
        pattern: /^\s*(root|file_server|reverse_proxy|encode|tls|basicauth|header|php_fastcgi|php_server|rate_limit|respond|remote_ip|hide|not|forward_auth|uri|copy_headers)\b/m,
        alias: 'keyword'
      },
      'block': {
        pattern: /{[\s\S]*?}/,
        inside: {
          'punctuation': /[{}]/,
          'content': {
            pattern: /[\s\S]+/,
            inside: Prism.languages.caddy
          }
        }
      },
      'variable': {
        pattern: /\{\{[^}]+\}\}/,
        alias: 'variable'
      },
      'matcher': {
        pattern: /@\w+/,
        alias: 'function'
      },
      'domain': {
        pattern: /^[^\s{]+/m,
        alias: 'string'
      },
      'path': {
        pattern: /(?<=\s)\/[^\s]*/,
        alias: 'string'
      },
      'url': {
        pattern: /https?:\/\/[^\s]*/,
        alias: 'string'
      },
      'email': {
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        alias: 'string'
      },
      'wildcard': {
        pattern: /\*/,
        alias: 'operator'
      },
      'option': {
        pattern: /\b(browse|internal|gzip|brotli|zstd|br|php_fastcgi|php_server|uri|copy_headers)\b/,
        alias: 'property'
      },
      'number': {
        pattern: /\b\d+\b/,
        alias: 'number'
      },
      'time-unit': {
        pattern: /\b[smhd]\b/,
        alias: 'unit'
      },
      'ip-address': {
        pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d{1,2})?\b/,
        alias: 'constant'
      },
      'punctuation': /[{}]/
    };
  }
  Prism.highlightAll();
});

watch(() => props.hosts, () => {
  nextTick(() => {
    Prism.highlightAll();
  });
}, { deep: true });

const caddyConfig = computed(() => {
  return props.hosts
    .map((host) => {
      const lines = [];
      
      // Add preset comment if available
      if (host.presetName) {
        lines.push(`# ${host.presetName}`);
      }

      if (host.fileServer && host.fileServer.frankenphp) {
        lines.push('{');
        lines.push('    frankenphp');
        lines.push('}');
      }

      lines.push(`${host.domain} {`);

      if (host.fileServer) {
        lines.push(`    root * ${host.fileServer.root}`);
        if (host.fileServer.frankenphp) {
          lines.push('    php_server');
        } else if (host.fileServer.php) {
          lines.push('    php_fastcgi unix//run/php/php-fpm.sock');
        }
        lines.push(`    file_server${host.fileServer.browse ? ' browse' : ''}`);
      } else if (host.reverseProxy) {
        lines.push(`    reverse_proxy ${host.reverseProxy}`);
      }
      
      // Handle encoding directives
      if (host.performance?.brotli) {
        lines.push('    encode zstd br gzip');
      } else if (host.encode) {
        lines.push('    encode');
      }

      // Security settings
      if (host.security?.cspEnabled && host.security?.csp && host.security.csp.trim()) {
        lines.push(`    header Content-Security-Policy "${host.security.csp}"`);
      }

      if (host.security?.ipFilter?.enabled && (host.security?.ipFilter?.allow?.length || host.security?.ipFilter?.block?.length)) {
        lines.push('    @blocked {');
        if (host.security.ipFilter.block?.length) {
          lines.push(`        remote_ip ${host.security.ipFilter.block.join(' ')}`);
        }
        if (host.security.ipFilter.allow?.length) {
          lines.push(`        not remote_ip ${host.security.ipFilter.allow.join(' ')}`);
        }
        lines.push('    }');
        lines.push('    respond @blocked 403');
      }

      // Forward Authentication
      if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url) {
        lines.push('    forward_auth * {');
        lines.push(`        uri ${host.security.forwardAuth.url}`);
        if (host.security.forwardAuth.verifyHeader && host.security.forwardAuth.verifyValue) {
          lines.push('        copy_headers {');
          lines.push(`            ${host.security.forwardAuth.verifyHeader} ${host.security.forwardAuth.verifyValue}`);
          lines.push('        }');
        }
        lines.push('    }');
      }

      if (host.security?.rateLimit?.enabled && host.security.rateLimit?.requests && host.security.rateLimit.window) {
        lines.push(`    rate_limit ${host.security.rateLimit.requests} ${host.security.rateLimit.window}`);
      }

      // CORS settings
      if (host.cors?.enabled && host.cors.allowOrigins?.length) {
        const origins = host.cors.allowOrigins.join(' ');
        lines.push(`    header Access-Control-Allow-Origin "${origins}"`);
        if (host.cors.allowMethods?.length) {
          lines.push(`    header Access-Control-Allow-Methods "${host.cors.allowMethods.join(',')}"`);
        }
        if (host.cors.allowHeaders?.length) {
          lines.push(`    header Access-Control-Allow-Headers "${host.cors.allowHeaders.join(',')}"`);
        }
      }

      // Cache Control
      if (host.performance?.cacheControlEnabled && host.performance?.cacheControl?.trim()) {
        lines.push(`    header Cache-Control "${host.performance.cacheControl}"`);
      }

      // File Server Hide Patterns
      if (host.fileServer?.hide?.length > 0) {
        host.fileServer.hide.forEach(pattern => {
          lines.push('    file_server {');
          lines.push(`        hide ${pattern}`);
          lines.push('    }');
        });
      }

      if (host.tls?.email) {
        lines.push(`    tls ${host.tls.email}`);
      } else if (host.tls?.selfSigned) {
        lines.push('    tls internal');
      }
      else if(host.tls?.certFile && host.tls?.keyFile) {
        lines.push(`    tls ${host.tls.certFile} ${host.tls.keyFile}`);
      }

      if (host.basicAuth?.length) {
        host.basicAuth.forEach(({ username, password }) => {
          lines.push(`    basicauth * {`);
          lines.push(`        ${username} ${password}`);
          lines.push('    }');
        });
      }

      if (host.headers?.length) {
        host.headers.forEach(({ name, value }) => {
          lines.push(`    header ${name} "${value}"`);
        });
      }

      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
});

function downloadConfig() {
  const blob = new Blob([caddyConfig.value], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Caddyfile';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyConfig() {
  navigator.clipboard.writeText(caddyConfig.value);
}

const validationIssues = computed(() => validateHosts(props.hosts));
const errors = computed(() => validationIssues.value.filter(i => i.type === 'error'));
const warnings = computed(() => validationIssues.value.filter(i => i.type === 'warning'));
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

    <div class="actions -mb-12 relative z-10 pr-4 pt-4" style="margin-bottom:-60px;">
      <div class="ml-auto flex gap-2">
        <button
          @click="downloadConfig"
          class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg p-2 transition-colors"
          title="Download Caddyfile"
        >
          <Download class="w-5 h-5" />
        </button>
        <button
          @click="copyConfig"
          class="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg p-2 transition-colors"
          title="Copy to Clipboard"
        >
          <Copy class="w-5 h-5" />
        </button>
      </div>
    </div>
    <pre class="rounded-lg p-4 pt-16 bg-slate-900"><code class="language-caddy">{{ caddyConfig }}</code></pre>
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