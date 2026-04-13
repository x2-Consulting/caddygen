# Changelog

## [Unreleased]

### Added

#### Traefik dynamic config output (Feature 1)
- Server type toggle now has a **Traefik** option alongside Caddy and Nginx
- `traefikGenerator.ts` converts CaddyHost[] to a Traefik file-provider dynamic YAML:
  - Routers with `Host()` rules, `websecure` entrypoint, `letsencrypt` certResolver by default
  - Services with `loadBalancer.servers` from the reverse proxy target
  - Middlewares: basicAuth, ipAllowList (v3), rateLimit, forwardAuth, compress, headers (custom + CORS + CSP)
  - Automatic HTTP router generated alongside each HTTPS router
  - Header comment block explains static config requirements and file-server limitations
- Output uses YAML syntax highlighting (Prism.js `prism-yaml`)
- Filename changes to `traefik-dynamic.yml`; reload hint shows the correct `cp` command
- Caddy Admin API panel is hidden when Traefik is selected
- Export All zip includes `<server-name>.traefik-dynamic.yml` for Traefik servers

#### Config snippets / host templates (Feature 2)
- **Save as template** button in every HostForm footer — inline name input, saves the full
  host configuration (without domain or ID) to localStorage
- **From Template** button appears next to "Add New Host" whenever templates exist
- `TemplateModal`: searchable list of saved templates with feature badges
  (Reverse proxy, HTTPS, Compression, Basic auth, CORS, IP filter, Rate limit, etc.)
  and individual delete buttons
- `useTemplates` composable: localStorage-backed store with save/delete/apply; shared
  reactive state across all component instances

#### Improved Caddyfile import parser (Feature 4)
- Replaced the naive line-split parser with a proper **brace-depth block extractor**:
  - Global options block (`{ }` with no preceding domain) is correctly skipped
  - Snippet definitions `(name) { }` are skipped
  - Multi-domain site addresses (`a.com b.com { }`) supported — first address used as canonical domain
  - `handle`, `route`, and `handle_path` blocks are flattened so nested directives are extracted
  - Matcher definitions (`@name`) are skipped without breaking the parse
- Additional directives extracted: `tls` with cert/key paths, `selfSigned` (internal), email variants;
  `header` (custom response headers); `forward_auth`; `rate_limit`; `php_fastcgi`; `frankenphp`;
  `basicauth` (marks entry — credentials cannot be imported)

#### Config history (Feature 3)
- Every intentional action (Download, Copy, Apply via Admin API) records a **config snapshot**
- `useConfigHistory` composable: localStorage store, max 30 entries per install, keyed by server ID;
  duplicate suppression (skip if content matches the most recent entry)
- **History panel** in CaddyConfig.vue: clock icon button appears when history exists;
  lists entries with timestamp and content preview; Download and Delete per entry; "Clear all" button
- History is per-server (identified by server ID) and persists across page reloads

#### Preset suggestion link (Feature 5)
- "Suggest a preset" link at the bottom of the PresetModal footer opens a GitHub issue
  pre-labelled `preset request` with a title prefix

#### 28 additional presets (Feature 6)
Expanded preset library from 88 to 116+ entries across new and existing categories:
- **Downloaders**: MeTube (8081), Seafile (8000)
- **Media Management**: Autobrr (7474), Notifiarr (5454)
- **Home Automation**: Homebridge (8581), Z-Wave JS UI (8091), Scrypted (11080)
- **Development**: SonarQube (9000), Gogs (3000)
- **Monitoring**: Gatus (8080), Changedetection.io (5000), Beszel (8090)
- **Productivity**: Stirling PDF (8080), Vikunja (3456), Planka (1337), Memos (5230), Hoarder (3000), Monica (8000)
- **Authentication**: Zitadel (8080), Kanidm (8443)
- **Security**: Nginx Proxy Manager (81), Crowdsec (6060), Netbird (80)
- **Container & Server Management**: Caprover (3000), Pocketbase (8090), MinIO (9001)
- **Password & Secrets Management**: Infisical (8080)
- **Messaging & Communication**: Listmonk (9000), Mailcow (80), Conduit (6167)

### Added

#### Basic auth, custom headers, and full CORS UI
- Basic Authentication section in HostForm: add/remove username + hashed-password pairs
- Custom Response Headers section: add/remove arbitrary name/value header pairs
- CORS: Allow Methods pill-checkboxes (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD)
- CORS: Allow Headers textarea alongside existing Allow Origins

#### Nginx import parser
- Import modal now has a Caddy / Nginx format toggle (pill buttons)
- `parseNginxConfig()` extracts `server {}` blocks and maps:
  - `server_name` → domain; `proxy_pass` → reverse proxy; `root` + `autoindex` → file server
  - `ssl_certificate` / `ssl_certificate_key` → TLS (auto-detects Let's Encrypt managed paths)
  - `gzip on` → encode; `add_header` CSP, Cache-Control, CORS, custom headers
  - `allow` / `deny` → IP filter; `location ~ .php` → PHP enabled
  - HTTP-only redirect blocks are skipped automatically
- Upload button label and textarea placeholder update to match selected format
- Modal title updated to "Import Config"

#### Export all servers as zip
- "Export All" button in header downloads every server's config as a zip archive
- Each file named `<server-name>.Caddyfile` or `<server-name>.nginx.conf`
- Uses `fflate` for in-browser zip creation (no server required)

#### Global Caddy options block
- Collapsible "Global Caddy Options" panel per server (Caddy servers only)
- Configurable fields: ACME email, admin endpoint, custom ACME CA URL, debug toggle
- Generates the top-level `{ }` block prepended to the Caddyfile when any option is set
- Options are included in both the live preview and Export All zip

#### Unit test suite (Vitest)
- 51 tests across 3 files: `validate.test.ts`, `caddyGenerator.test.ts`, `nginxGenerator.test.ts`
- Covers: domain validation, proxy/file-server checks, TLS modes, IP filter, rate limit,
  forward auth, CORS, Caddy directive output, Nginx server block output, global block
- Run with `npm test`

### Changed

#### Caddy generator extracted to shared utility
- Inline Caddy config generation moved from `CaddyConfig.vue` into `src/utils/caddyGenerator.ts`
- `generateCaddyConfig(hosts, globalOptions?)` now used by both CaddyConfig.vue and the Export All feature

#### Mobile responsiveness improvements
- Header stacks vertically on small screens; button labels hidden below `sm` breakpoint (icons remain)
- Container padding reduced to `1rem` on mobile, scales up to `2rem` on large screens
- Global options panel uses a single column on mobile, two columns on `sm+`
- Caddy API panel input and button stack vertically on mobile
- HostForm key-value rows (basic auth, headers) reflow to a stacked layout on narrow viewports

#### TypeScript build errors resolved
- `FormHost` interface + `initFormHost()` added to HostForm.vue — eliminates non-null assertion noise
- `v-if` narrowing guards prevent TS18048 on `host.fileServer` template bindings
- Removed unused `Globe` import from App.vue and unused `props` variable from ImportModal.vue
- `vue-tsc` now passes cleanly as part of `npm run build`

### Added

#### Multi-server management
- Server tab bar — manage multiple independent servers side by side
- Each server has its own name, hosts, and server type (Caddy or Nginx)
- Rename servers by double-clicking a tab; delete with the × button
- Existing saved configs are automatically migrated to a "Default" server on first load

#### Nginx config generation
- Full Nginx `server {}` block generator per host
- Reverse proxy with WebSocket upgrade headers (`Upgrade`, `Connection`)
- File server with `autoindex`, PHP-FPM (`fastcgi_pass`) location block
- SSL/TLS: certbot-managed paths, self-signed (with generation command comment), manual cert/key
- Automatic HTTP → HTTPS redirect `server {}` block when TLS is enabled
- Gzip compression; brotli as commented `ngx_brotli` module hint
- CSP, CORS, cache control, custom headers via `add_header`
- IP filtering with `allow`/`deny`; rate limiting with `limit_req` (includes `http {}` zone comment)
- Forward auth via `auth_request` + internal `/auth-verify` location block
- Basic auth with `.htpasswd` hint
- Caddy-only fields (FrankenPHP, Brotli) hidden in the form when Nginx is selected
- Nginx syntax highlighting via Prism.js `prism-nginx` component
- Download filename changes to `nginx.conf` for Nginx servers

#### Apply & reload workflow
- **Caddy Admin API** — "Apply & Reload" button in a toggleable panel (Caddy servers only)
  - Configurable admin URL (default `http://localhost:2019`), persisted to localStorage
  - Fetches current running config via `GET /config/` and auto-downloads it as `Caddyfile-backup_YYYY-MM-DD_HH-MM-SS.json` before applying
  - POSTs new Caddyfile to `POST /load` with `Content-Type: text/caddyfile`
  - Inline success/error feedback; backup failure is non-fatal
- **Pending changes indicator** — pulsing yellow "Unsaved changes" label and dot badges on Download/Copy buttons when config has changed since last action
- **Reload hint banner** — dismissible banner shown after copy/download/apply with the correct reload command:
  - Caddy: `sudo systemctl reload caddy` / `caddy reload --config /etc/caddy/Caddyfile`
  - Nginx: `sudo nginx -s reload` / `sudo systemctl reload nginx`

#### Config validation
- Real-time client-side validation displayed above the config output
- Errors (red): empty domain, whitespace in domain, duplicate domains, empty proxy target, non-URL proxy target, empty file server root, incomplete TLS (cert without key), forward auth with no URL, rate limit count < 1
- Warnings (yellow): multiple TLS modes set, IP filter enabled with no IPs, invalid IP/CIDR formats, rate limit window wrong format, CORS enabled with no origins

#### Share via URL
- Share button (visible when hosts are configured) copies a shareable URL to the clipboard
- All servers and hosts are encoded as lz-string compressed base64 in `?config=`
- On load the param is decoded, hydrated into state, and stripped from the URL
- Backwards compatible with the previous single-host-array format

#### Dark mode
- Light/dark toggle (Sun/Moon) in the header
- Defaults to dark mode; preference persisted to localStorage
- Light theme: white background, dark text, light borders
- Dark theme: original dark navy colours
- Code output block always uses a dark background regardless of mode
- Preset logos render correctly in both modes

#### Expanded presets (45 → 88)
Added 43 new presets across all categories:
- **Media & Streaming**: Navidrome, Audiobookshelf, Immich, PhotoPrism, Kavita, Komga
- **Downloaders**: Syncthing, Filebrowser
- **Media Management**: Readarr, Bazarr, Tdarr, Jellyseerr
- **Home Automation**: ESPHome, Frigate, Zigbee2MQTT
- **Development**: Forgejo, Woodpecker CI, Coolify
- **Monitoring**: InfluxDB, Scrutiny, Glances, ntfy
- **Productivity**: Wiki.js, Paperless-ngx, Mealie, Joplin Server, Outline, Wallabag, Linkwarden
- **Authentication**: Authentik, LLDAP
- **Security**: AdGuard Home, WG-Easy, Headscale
- **Containers**: Dockge, Yacht, Cockpit
- **Passwords**: Passbolt
- **Messaging**: Matrix Synapse, Gotify, Zulip

### Changed
- GitHub links updated to `x2-Consulting/caddygen`
- README fully rewritten to reflect new features and correct repo references
- Share URL now encodes all servers (previously encoded a flat hosts array)
- `lz-string` added as a dependency for URL compression
