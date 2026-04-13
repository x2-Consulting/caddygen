<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CaddyHost } from '../types/caddy';
import PresetSelect from './PresetSelect.vue';
import HelpTooltip from './HelpTooltip.vue';
import type { PresetConfig } from '../types/caddy';
import { v4 as uuidv4 } from 'uuid';
import { useTemplates } from '../composables/useTemplates';

// FormHost guarantees the always-initialised nested objects are non-optional,
// which satisfies the Vue template type checker without needing non-null assertions everywhere.
interface FormHost extends Omit<CaddyHost, 'tls' | 'security' | 'cors' | 'performance' | 'basicAuth' | 'headers'> {
  tls: NonNullable<CaddyHost['tls']>;
  security: NonNullable<CaddyHost['security']>;
  cors: NonNullable<CaddyHost['cors']>;
  performance: NonNullable<CaddyHost['performance']>;
  basicAuth: NonNullable<CaddyHost['basicAuth']>;
  headers: NonNullable<CaddyHost['headers']>;
}

function initFormHost(initial?: CaddyHost): FormHost {
  return {
    id: initial?.id ?? uuidv4(),
    domain: initial?.domain ?? '',
    presetName: initial?.presetName,
    reverseProxy: initial?.reverseProxy,
    fileServer: initial?.fileServer,
    encode: initial?.encode ?? false,
    tls: { email: '', selfSigned: false, certFile: '', keyFile: '', ...initial?.tls },
    security: initial?.security ?? {
      ipFilter: { enabled: false, allow: [], block: [] },
      rateLimit: { enabled: false, requests: 100, window: '1m' },
      cspEnabled: false,
      csp: '',
      forwardAuth: { enabled: false, url: '', verifyHeader: '', verifyValue: '' }
    },
    cors: { enabled: false, allowOrigins: [], allowMethods: [], allowHeaders: [], ...initial?.cors },
    performance: { brotli: false, cacheControlEnabled: false, cacheControl: '', ...initial?.performance },
    basicAuth: initial?.basicAuth ?? [],
    headers: initial?.headers ?? [],
  };
}

const props = defineProps<{
  initialHost?: CaddyHost;
  serverType?: 'caddy' | 'nginx' | 'traefik';
}>();

const isNginx = computed(() => props.serverType === 'nginx');

const emit = defineEmits<{
  save: [host: CaddyHost];
  cancel: [];
}>();

const host = ref<FormHost>(initFormHost(props.initialHost));

// --- Templates ---
const { saveTemplate } = useTemplates();
const showSaveTemplate = ref(false);
const templateName = ref('');

function handleSaveTemplate() {
  if (!templateName.value.trim()) return;
  saveTemplate(host.value, templateName.value);
  templateName.value = '';
  showSaveTemplate.value = false;
}

const serverType = ref(host.value.fileServer ? 'fileServer' : '');

function handleServerTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  serverType.value = value;
  if (serverType.value === 'fileServer') {
    host.value.reverseProxy = undefined;
    if (!host.value.fileServer) {
      host.value.fileServer = {
        root: '/var/www/html',
        browse: false,
        php: false,
        frankenphp: false,
        hide: []
      };
    }
  } else {
    host.value.fileServer = undefined;
  }
}
const showAdvanced = ref(false);

const tlsHasEmailOrSelfSigned = computed(() => {
  if (host.value.tls.email?.trim()) return true;
  if (host.value.tls.selfSigned) return true;
  return false;
});

function handleSubmit() {
  emit('save', host.value);
}

function applyPreset(preset: PresetConfig) {
  host.value.reverseProxy = `http://localhost:${preset.port}`;
  host.value.presetName = preset.name;
  host.value.fileServer = undefined;
  serverType.value = '';
}

function setFileServerHide(e: Event) {
  if (host.value.fileServer) {
    host.value.fileServer.hide = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean);
  }
}

function addBasicAuth() {
  host.value.basicAuth.push({ username: '', password: '' });
}

function removeBasicAuth(index: number) {
  host.value.basicAuth.splice(index, 1);
}

function addHeader() {
  host.value.headers.push({ name: '', value: '' });
}

function removeHeader(index: number) {
  host.value.headers.splice(index, 1);
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="host-form bg-card rounded-lg border border-border/50 shadow-lg">
    <div class="p-6">
      <h2 class="text-2xl font-semibold mb-6 text-foreground">
        {{ initialHost ? 'Edit' : 'Add New' }} Host
      </h2>

      <div class="space-y-4">
        <div class="form-group">
          <label>Domain:</label>
          <input v-model="host.domain" required placeholder="example.com" />
        </div>
    
        <div class="form-group">
          <label>Preset (optional):</label>
          <PresetSelect 
            :initial-preset-name="host.presetName"
            @select="applyPreset" 
          />
        </div>

        <div class="form-group">
          <label>Type:</label>
          <select v-model="serverType" @change="handleServerTypeChange">
            <option value="">Reverse Proxy</option>
            <option value="fileServer">File Server</option>
          </select>
        </div>

        <template v-if="serverType === 'fileServer' && host.fileServer">
          <div class="form-group">
            <label>Root Directory:</label>
            <input v-model="host.fileServer.root" placeholder="/var/www/html" />
          </div>
          <div class="form-group">
            <label class="checkbox">
              <input type="checkbox" v-model="host.fileServer.browse" />
              Enable directory listing
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox">
              <input type="checkbox" v-model="host.fileServer.php" />
              Enable PHP support
            </label> 
          </div>

          <div class="form-group" v-if="!isNginx && (host.fileServer.php || host.fileServer.frankenphp)">
            <label class="checkbox">
              <input type="checkbox" v-model="host.fileServer.frankenphp" />
              Enable <a href="https://frankenphp.dev">FrankenPHP</a>
            </label>
          </div>
        </template>

        <template v-if="serverType === ''">
          <div class="form-group">
            <label>Proxy To:</label>
            <input
              v-model="host.reverseProxy"
              placeholder="http://localhost:3000"
              required
            />
          </div>
        </template>

        <div class="form-group">
          <label class="checkbox">
            <input type="checkbox" v-model="host.encode" />
            Enable Gzip and Zstandard compression
            <HelpTooltip content="Compresses responses (gzip + zstd) before sending to the browser. Reduces bandwidth for HTML, CSS, JS, and JSON. Has no effect on already-compressed files like images or video." />
          </label>
        </div>

        <button type="button" @click="showAdvanced = !showAdvanced" class="btn-link">
          {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options
        </button>

        <div v-if="showAdvanced" class="advanced-options">
          <div class="form-group">
            <label class="flex items-center gap-1">
              TLS Email (for Let's Encrypt):
              <HelpTooltip content="Caddy will automatically obtain and renew a free TLS certificate via Let's Encrypt. The email is used for certificate expiry notifications only — leave blank for anonymous registration. Requires port 80 and 443 to be publicly reachable." />
            </label>
            <input
              v-model="host.tls.email"
              type="email"
              placeholder="admin@example.com"
            />
          </div>

          <div class="form-group">
            <label class="checkbox">
              <input type="checkbox" v-model="host.tls.selfSigned" />
              Use self-signed certificate
              <HelpTooltip content="Caddy generates a certificate signed by its own local CA. Useful for internal or development services. Browsers will show a security warning unless you trust the Caddy root CA manually." />
            </label>
          </div>

          <div class="form-group">
            <label class="flex items-center gap-1">
              Cert File:
              <HelpTooltip content="Absolute path to your PEM-encoded certificate file on the server (e.g. /etc/ssl/certs/example.pem). Both Cert File and Key File must be set together. Disables automatic ACME certificate management." />
            </label>
            <input v-model="host.tls.certFile" placeholder="/etc/ssl/certs/example.pem" :disabled="tlsHasEmailOrSelfSigned" />
          </div>
          <div class="form-group">
            <label class="flex items-center gap-1">
              Key File:
              <HelpTooltip content="Absolute path to the private key file matching your certificate (e.g. /etc/ssl/private/example-key.pem). Must be set alongside Cert File." />
            </label>
            <input v-model="host.tls.keyFile" placeholder="/etc/ssl/private/example-key.pem" :disabled="tlsHasEmailOrSelfSigned" />
          </div>

          <!-- Security Section -->
          <div class="advanced-section">
            <h3 class="text-lg font-semibold mb-4">Security</h3>
            
            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.cspEnabled" />
                Enable Content Security Policy
                <HelpTooltip content="Adds a Content-Security-Policy header that tells browsers which sources are allowed to load scripts, styles, images, etc. Helps prevent XSS attacks. Start strict and relax as needed." />
              </label>
            </div>

            <div class="form-group" v-if="host.security.cspEnabled">
              <label class="flex items-center gap-1">
                Content Security Policy:
                <HelpTooltip content="Common examples:&#10;• default-src 'self'&#10;  (only same-origin, strictest)&#10;• default-src 'self'; img-src 'self' data:&#10;  (allow inline images)&#10;• default-src 'self'; script-src 'self' 'unsafe-inline'&#10;  (allow inline scripts — weaker)" />
              </label>
              <input
                v-model="host.security.csp"
                placeholder="default-src 'self';"
              />
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.ipFilter.enabled" />
                Enable IP Filtering
                <HelpTooltip content="Restrict access to specific IP addresses or ranges using CIDR notation:&#10;• 192.168.1.100/32  — single IP&#10;• 192.168.1.0/24    — whole /24 subnet&#10;• 10.0.0.0/8        — entire 10.x.x.x range&#10;• ::1/128           — IPv6 loopback" />
              </label>
            </div>

            <div v-if="host.security.ipFilter.enabled">
              <label>IP Allow List (one per line):</label>
              <textarea
                :value="host.security.ipFilter.allow.join('\n')"
                @input="e => host.security.ipFilter.allow = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                placeholder="192.168.1.0/24"
                rows="3"
              ></textarea>

              <label>IP Block List (one per line):</label>
              <textarea
                :value="host.security.ipFilter.block.join('\n')"
                @input="e => host.security.ipFilter.block = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                placeholder="10.0.0.0/8"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.forwardAuth.enabled" />
                Enable Forward Authentication
                <HelpTooltip content="Every request is forwarded to an auth server (e.g. Authelia, Authentik) before being proxied. A 2xx response allows the request through; 4xx blocks it. The auth server receives the original request headers including cookies." />
              </label>
            </div>

            <div v-if="host.security.forwardAuth.enabled" class="space-y-4" style="margin-bottom:20px;">
              <div class="form-group">
                <label class="flex items-center gap-1">
                  Authentication URL:
                  <HelpTooltip content="The full URL your auth server exposes for verification. Examples:&#10;• Authelia: http://authelia:9091/api/authz/forward-auth&#10;• Authentik: http://authentik:9000/outpost.goauthentik.io/auth/caddy&#10;Must be reachable from the machine running Caddy." />
                </label>
                <input
                  v-model="host.security.forwardAuth.url"
                  placeholder="http://authelia:9091/api/verify"
                  required
                />
              </div>
              <div class="form-group">
                <label>Verify Header (optional):</label>
                <input
                  v-model="host.security.forwardAuth.verifyHeader"
                  placeholder="Remote-User"
                />
              </div>
              <div class="form-group">
                <label>Verify Value (optional):</label>
                <input
                  v-model="host.security.forwardAuth.verifyValue"
                  placeholder="{{user}}"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.rateLimit.enabled" />
                Enable Rate Limiting
                <HelpTooltip content="Limits how many requests a single client IP can make in a given time window. Helps protect against brute-force attacks and abusive crawlers. Clients that exceed the limit receive a 429 Too Many Requests response." />
              </label>
            </div>

            <div class="form-group" v-if="host.security.rateLimit.enabled">
              <label class="flex items-center gap-1">
                Rate Limit:
                <HelpTooltip content="Window format: a number followed by a unit.&#10;• 30s  — 30 seconds&#10;• 1m   — 1 minute&#10;• 1h   — 1 hour&#10;• 1d   — 1 day&#10;Example: 100 requests per 1m means each IP can make at most 100 requests per minute." />
              </label>
              <div class="flex gap-2">
                <input
                  type="number"
                  v-model="host.security.rateLimit.requests"
                  class="w-24"
                  min="1"
                />
                <span class="text-muted-foreground self-center">requests per</span>
                <input
                  v-model="host.security.rateLimit.window"
                  placeholder="1m"
                  class="w-24"
                />
              </div>
            </div>
          </div>

          <!-- CORS Section -->
          <div class="advanced-section">
            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.cors.enabled" />
                Enable CORS
              </label>
            </div>

            <template v-if="host.cors.enabled">
              <div class="form-group">
                <label>Allow Origins (one per line):</label>
                <textarea
                  :value="host.cors.allowOrigins.join('\n')"
                  @input="e => host.cors.allowOrigins = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                  placeholder="https://example.com"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-group">
                <label>Allow Methods:</label>
                <div class="method-checkboxes">
                  <label v-for="method in ['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD']" :key="method" class="method-check">
                    <input
                      type="checkbox"
                      :checked="host.cors.allowMethods.includes(method)"
                      @change="(e) => { const el = e.target as HTMLInputElement; el.checked ? host.cors.allowMethods.push(method) : host.cors.allowMethods.splice(host.cors.allowMethods.indexOf(method), 1) }"
                    />
                    {{ method }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Allow Headers (one per line):</label>
                <textarea
                  :value="host.cors.allowHeaders.join('\n')"
                  @input="e => host.cors.allowHeaders = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                  placeholder="Authorization&#10;Content-Type"
                  rows="3"
                ></textarea>
              </div>
            </template>
          </div>

          <!-- Performance Section -->
          <div class="advanced-section">
            <h3 class="text-lg font-semibold mb-4">Performance</h3>
 
            <div class="form-group" v-if="!isNginx">
              <label class="checkbox">
                <input type="checkbox" v-model="host.performance.brotli" />
                Enable Brotli compression (requires <a href="https://caddyserver.com/docs/modules/http.encoders.br">an additional module</a>)
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.performance.cacheControlEnabled" />
                Enable Cache Control
              </label>
            </div>

            <div class="form-group" v-if="host.performance.cacheControlEnabled">
              <label>Cache Control:</label>
              <input
                v-model="host.performance.cacheControl"
                placeholder="public, max-age=3600"
              />
            </div>
          </div>

          <!-- Basic Auth Section -->
          <div class="advanced-section">
            <h3 class="flex items-center gap-1 text-lg font-semibold mb-4">
              Basic Authentication
              <HelpTooltip content="Protects the site with a username and password prompt in the browser. The password must be stored as a bcrypt hash — never plaintext.&#10;&#10;Generate a hash with:&#10;  caddy hash-password&#10;or online at bcrypt-generator.com" />
            </h3>
            <div v-for="(entry, i) in host.basicAuth" :key="i" class="key-value-row">
              <input v-model="entry.username" placeholder="username" />
              <input v-model="entry.password" placeholder="bcrypt hash (caddy hash-password)" type="password" />
              <button type="button" class="btn-remove" @click="removeBasicAuth(i)">×</button>
            </div>
            <button type="button" class="btn-add" @click="addBasicAuth">+ Add User</button>
          </div>

          <!-- Custom Headers Section -->
          <div class="advanced-section">
            <h3 class="text-lg font-semibold mb-4">Custom Response Headers</h3>
            <div v-for="(header, i) in host.headers" :key="i" class="key-value-row">
              <input v-model="header.name" placeholder="Header-Name" />
              <input v-model="header.value" placeholder="value" />
              <button type="button" class="btn-remove" @click="removeHeader(i)">×</button>
            </div>
            <button type="button" class="btn-add" @click="addHeader">+ Add Header</button>
          </div>

          <!-- File Server Hide Patterns -->
          <template v-if="serverType === 'fileServer' && host.fileServer">
            <div class="advanced-section">
              <h3 class="text-lg font-semibold mb-4">Hidden Files</h3>
              <div class="form-group">
                <label>Hide Patterns (one per line):</label>
                <textarea
                  :value="host.fileServer.hide.join('\n')"
                  @input="setFileServerHide"
                  placeholder=".git/*
.env
*.log"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="form-actions border-t border-border/50 p-6 bg-muted/50">
      <button type="submit" class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
        Save Host
      </button>
      <button
        type="button"
        @click="emit('cancel')"
        class="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors"
      >
        Cancel
      </button>
      <!-- Save as template -->
      <div class="save-template-wrap">
        <button
          v-if="!showSaveTemplate"
          type="button"
          class="btn-link text-xs"
          @click="showSaveTemplate = true; templateName = host.domain || ''"
        >Save as template</button>
        <div v-else class="save-template-row">
          <input
            v-model="templateName"
            type="text"
            placeholder="Template name"
            class="save-template-input"
            @keydown.enter.prevent="handleSaveTemplate"
            @keydown.escape="showSaveTemplate = false"
            autofocus
          />
          <button type="button" class="btn-template-save" @click="handleSaveTemplate">Save</button>
          <button type="button" class="btn-link text-xs" @click="showSaveTemplate = false">Cancel</button>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.host-form {
  max-width: 600px;
  margin: 1rem auto;
}

@media (max-width: 640px) {
  .host-form {
    margin: 0.5rem 0;
    border-radius: 0.5rem;
  }
}

.form-group {
  margin-bottom: 1rem;
  position:relative;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
  font-weight: 500;
}

.form-group label.checkbox {
  padding-left:40px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  font-size: 1rem;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

.form-group input:disabled {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  cursor: not-allowed;
  opacity: 0.5;
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: hsl(var(--foreground));
  cursor: pointer;
  user-select: none;
  font-size: 0.9375rem;
}

.checkbox input {
  appearance: none;
  -webkit-appearance: none;
  width: 0.875rem;
  height: 0.875rem;
  border: 1.5px solid hsl(var(--border));
  border-radius: 4px;
  background-color: hsl(var(--background));
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin: 0;
  position:absolute;
  top: -1px;
  left: 0px;
}

.checkbox input:checked {
  background-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.checkbox input:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 45%;
  width: 4px;
  height: 7px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.checkbox input:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-color: hsl(var(--primary));
}

.checkbox:hover input {
  border-color: hsl(var(--primary));
}

.advanced-options {
  margin-top: 1rem;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background-color: hsl(var(--muted));
}

.advanced-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid hsl(var(--border));
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  font-size: 1rem;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-end;
  align-items: center;
}

.save-template-wrap {
  margin-right: auto;
  display: flex;
  align-items: center;
}

.save-template-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-template-input {
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  width: 160px;
}

.btn-template-save {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-template-save:hover {
  background: hsl(var(--primary) / 0.85);
}

button.btn-link {
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  padding: 0.5rem 1rem;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

button.btn-link:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

.key-value-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

@media (max-width: 480px) {
  .key-value-row {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
  }
  .key-value-row input:first-of-type {
    grid-column: 1;
  }
  .key-value-row input:last-of-type {
    grid-column: 1;
  }
  .key-value-row .btn-remove {
    grid-row: 1 / span 2;
    grid-column: 2;
    align-self: center;
  }
}

.key-value-row input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

.btn-remove {
  background: none;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  transition: all 0.2s ease;
}

.btn-remove:hover {
  background: hsl(var(--destructive) / 0.1);
  border-color: hsl(var(--destructive));
  color: hsl(var(--destructive));
}

.btn-add {
  background: none;
  border: 1px dashed hsl(var(--border));
  color: hsl(var(--muted-foreground));
  border-radius: 4px;
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.25rem;
}

.btn-add:hover {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}

.method-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.method-check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  transition: all 0.2s ease;
  user-select: none;
}

.method-check:has(input:checked) {
  background: hsl(var(--primary) / 0.15);
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
}

.method-check input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 0.75rem;
  height: 0.75rem;
  border: 1.5px solid currentColor;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.method-check input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 45%;
  width: 3px;
  height: 6px;
  border: solid currentColor;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg);
}
</style>