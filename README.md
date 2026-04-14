# CaddyGen — Caddy & Nginx Config Generator

CaddyGen is a user-friendly web interface for generating **Caddy** and **Nginx** server configurations. Manage multiple servers, create reverse proxy and file server configs, and apply them directly to a running Caddy instance — all from your browser.

---

## Features

### Core
- **Visual configuration builder** for Caddy and Nginx
- **Reverse proxy** and **file server** setup
- **SSL/TLS configuration** — Let's Encrypt, self-signed, or manual cert/key paths
- **Import/Export** — paste or upload an existing Caddyfile or nginx.conf to import hosts
- **Local storage** — all configurations saved locally in your browser

### Multi-server management
- Manage multiple servers side by side with a tab bar
- Each server is independent — its own hosts, server type, and global options
- Rename servers (double-click the tab), add, and delete
- Switch between **Caddy** and **Nginx** output per server

### Config generation
- **88 application presets** across 12 categories (media, automation, monitoring, dev tools, auth, containers, and more)
- Advanced **security options** — CSP, IP filtering, rate limiting, forward authentication
- **CORS configuration** — allow origins, methods (checkbox pills), and headers
- **Performance optimizations** — gzip/zstandard/brotli compression, cache control
- **Custom response headers** — add arbitrary name/value pairs per host
- **Basic authentication** — add username/hashed-password pairs per host
- **PHP / FrankenPHP** support for file servers

### Nginx support
- Full `server {}` block generation with WebSocket-ready reverse proxy headers
- PHP-FPM location block
- SSL with certbot paths, self-signed comment, or manual cert/key
- Automatic HTTP → HTTPS redirect block when TLS is enabled
- Gzip compression; brotli as a commented module hint

### Import
- **Caddyfile import** — paste or upload; parses domains, proxy targets, file servers, TLS, and encode
- **nginx.conf import** — paste or upload; parses `server {}` blocks including proxy_pass, SSL,
  gzip, CSP, CORS, Cache-Control, IP allow/deny, PHP-FPM, and custom headers
- Format toggle (Caddyfile / nginx.conf) in the import dialog

### Global Caddy options
- Per-server collapsible **Global Caddy Options** panel (Caddy servers only)
- Configurable: ACME email, admin endpoint, custom ACME CA URL, debug toggle
- Generates the top-level `{ }` block prepended to the Caddyfile

### Config validation
- Real-time client-side validation — errors in red, warnings in yellow
- Checks: empty/duplicate domains, missing proxy target, incomplete TLS, invalid IPs, CORS/rate limit misconfiguration, and more

### Apply & reload
- **Caddy Admin API** — push config directly to a running Caddy instance with zero downtime
  - Auto-downloads a timestamped backup of the current running config before applying
  - Configurable admin URL (default `http://localhost:2019`), remembered across sessions
- **Pending changes indicator** — pulsing dot on action buttons when config has changed since last action
- **Reload hint banner** — shows the correct reload command after copy/download/apply:
  - Caddy: `sudo systemctl reload caddy`
  - Nginx: `sudo nginx -s reload`

### Export all
- **Export All** button downloads every server's config as a single zip archive
- Files named `<server-name>.Caddyfile` or `<server-name>.nginx.conf`
- Includes global Caddy options blocks where configured

### Share via URL
- **Share button** encodes all server configs into a compressed URL
- Anyone opening the link gets the full config loaded instantly
- URL is cleaned after import

### Dark mode
- Light/dark toggle in the header, defaults to dark, persists across sessions

---

## How to Use

1. Click **"Add New Host"** to configure a host.
2. Optionally select an **application preset** to pre-fill the proxy target.
3. Choose **reverse proxy** or **file server**, configure SSL, security, and performance options.
4. Use the **Advanced Options** section to set basic auth, custom headers, CORS, IP filtering, rate limiting, and more.
5. View the generated config — errors and warnings appear above the output.
6. **Copy**, **download**, or **Apply & Reload** directly to a running Caddy instance.
7. Use **New Server** in the tab bar to manage multiple servers. Switch between **Caddy** and **Nginx** output with the toggle on the right of the tab bar.
8. Use **Export All** to download every server's config as a zip.

---

## Docker Deployment

### Run with Docker Compose
```yaml
services:
  app:
    image: ghcr.io/x2-consulting/caddygen:latest
    ports:
      - "8189:80"
    restart: unless-stopped
    container_name: caddygen
```

```bash
docker compose up -d
```

Access the app at `http://localhost:8189`.

### Build locally
```bash
docker build -t caddygen .
docker run -p 8189:80 caddygen
```

---

## Development Setup

**Stack:** Vue 3 · TypeScript · Vite · Tailwind CSS · Prism.js · Lucide Icons · lz-string · fflate

```bash
git clone https://github.com/x2-Consulting/caddygen.git
cd caddygen
npm install
npm run dev
```

Open `http://localhost:5173`.

### Production build

```bash
npm run build
npm run preview
```

The preview server binds to `0.0.0.0` and is accessible over the network at `http://<host-ip>:4173`.

### Running tests

```bash
npm test
```

51 unit tests covering the Caddy generator, Nginx generator, and config validator (Vitest).

---

## Preset Categories

| Category | Examples |
|---|---|
| Media & Streaming | Jellyfin, Plex, Immich, Navidrome, Audiobookshelf, PhotoPrism |
| Downloaders & File Sharing | qBittorrent, SABnzbd, Syncthing, Filebrowser |
| Media Management | Sonarr, Radarr, Readarr, Bazarr, Jellyseerr, Tdarr |
| Home Automation & IoT | Home Assistant, ESPHome, Frigate, Zigbee2MQTT |
| Development & Code Hosting | Gitea, Forgejo, GitLab, Coolify, Woodpecker CI |
| Monitoring & Analytics | Grafana, Prometheus, Uptime Kuma, InfluxDB, ntfy |
| Productivity & Collaboration | Nextcloud, Paperless-ngx, Wiki.js, Mealie, Outline |
| Authentication & Identity | Authentik, Authelia, Keycloak, LLDAP |
| Security & Networking | AdGuard Home, Pi-hole, WG-Easy, Headscale |
| Container & Server Management | Portainer, Dockge, Cockpit, Yacht |
| Password & Secrets Management | Vaultwarden, Passbolt, HashiCorp Vault |
| Messaging & Communication | Matrix Synapse, Rocket.Chat, Mattermost, Gotify, Zulip |

---

## License

MIT — free to use, modify, and distribute.
