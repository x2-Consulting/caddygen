# Changelog

## [Unreleased]

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
