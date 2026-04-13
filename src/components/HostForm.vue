<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CaddyHost } from '../types/caddy';
import PresetSelect from './PresetSelect.vue';
import type { PresetConfig } from '../types/caddy';
import { v4 as uuidv4 } from 'uuid';

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
  serverType?: 'caddy' | 'nginx';
}>();

const isNginx = computed(() => props.serverType === 'nginx');

const emit = defineEmits<{
  save: [host: CaddyHost];
  cancel: [];
}>();

const host = ref<FormHost>(initFormHost(props.initialHost));

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
          </label>
        </div>

        <button type="button" @click="showAdvanced = !showAdvanced" class="btn-link">
          {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options
        </button>

        <div v-if="showAdvanced" class="advanced-options">
          <div class="form-group">
            <label>TLS Email (for Let's Encrypt):</label>
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
            </label>
          </div>

          <div class="form-group">
            <label>Cert File:</label>
            <input v-model="host.tls.certFile" placeholder="cert.pem" :disabled="tlsHasEmailOrSelfSigned" />
          </div>
          <div class="form-group">
            <label>Key File:</label>
            <input v-model="host.tls.keyFile" placeholder="key.pem" :disabled="tlsHasEmailOrSelfSigned" />
          </div>

          <!-- Security Section -->
          <div class="advanced-section">
            <h3 class="text-lg font-semibold mb-4">Security</h3>
            
            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.cspEnabled" />
                Enable Content Security Policy
              </label>
            </div>
            
            <div class="form-group" v-if="host.security.cspEnabled">
              <label>Content Security Policy:</label>
              <input
                v-model="host.security.csp"
                placeholder="default-src 'self';"
              />
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" v-model="host.security.ipFilter.enabled" />
                Enable IP Filtering
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
              </label>
            </div>

            <div v-if="host.security.forwardAuth.enabled" class="space-y-4" style="margin-bottom:20px;">
              <div class="form-group">
                <label>Authentication URL:</label>
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
              </label>
            </div>

            <div class="form-group" v-if="host.security.rateLimit.enabled">
              <label>Rate Limit:</label>
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
            <h3 class="text-lg font-semibold mb-4">Basic Authentication</h3>
            <div v-for="(entry, i) in host.basicAuth" :key="i" class="key-value-row">
              <input v-model="entry.username" placeholder="username" />
              <input v-model="entry.password" placeholder="hashed password" type="password" />
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
  gap: 1rem;
  justify-content: flex-end;
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