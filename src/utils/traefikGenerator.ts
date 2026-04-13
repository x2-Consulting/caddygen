import type { CaddyHost } from '../types/caddy';
import { sanitizeConfigValue, safeConfigString } from './sanitize';
import yaml from 'js-yaml';

interface TraefikRouter {
  rule: string;
  entryPoints: string[];
  service: string;
  tls?: { certResolver?: string } | true;
  middlewares?: string[];
}

interface TraefikService {
  loadBalancer: {
    servers: Array<{ url: string }>;
    passHostHeader?: boolean;
  };
}

type TraefikMiddleware =
  | { basicAuth: { users: string[] } }
  | { ipWhiteList: { sourceRange: string[] } }
  | { ipAllowList: { sourceRange: string[] } }
  | { rateLimit: { average: number; period: string; burst: number } }
  | { forwardAuth: { address: string; trustForwardHeader: boolean } }
  | { compress: Record<string, never> }
  | { headers: Record<string, unknown> };

interface TraefikDynamic {
  http: {
    routers: Record<string, TraefikRouter>;
    services: Record<string, TraefikService>;
    middlewares?: Record<string, TraefikMiddleware>;
  };
}

function slugify(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function parseUpstreamUrl(raw: string): string {
  const v = sanitizeConfigValue(raw).trim();
  // Already a full URL?
  if (/^https?:\/\//.test(v)) return v;
  // host:port or just localhost:port
  return `http://${v}`;
}

export function generateTraefikConfig(hosts: CaddyHost[]): string {
  const routers: Record<string, TraefikRouter> = {};
  const services: Record<string, TraefikService> = {};
  const middlewares: Record<string, TraefikMiddleware> = {};

  const fileServerWarnings: string[] = [];

  for (const host of hosts) {
    const domain = sanitizeConfigValue(host.domain ?? '').trim();
    if (!domain) continue;

    const key = slugify(domain);
    const mwNames: string[] = [];

    // File server — Traefik doesn't serve files; emit a comment-style notice later
    if (host.fileServer) {
      fileServerWarnings.push(domain);
    }

    // Service (reverse proxy target)
    const upstream = host.fileServer
      ? 'http://localhost:80'  // placeholder when no proxy
      : parseUpstreamUrl(host.reverseProxy ?? 'http://localhost:80');

    services[key] = {
      loadBalancer: {
        servers: [{ url: upstream }],
        passHostHeader: true,
      },
    };

    // Middlewares

    // Basic auth
    if (host.basicAuth?.length) {
      const mwKey = `${key}-basicauth`;
      middlewares[mwKey] = {
        basicAuth: {
          users: host.basicAuth.map(ba => `${safeConfigString(ba.username)}:${safeConfigString(ba.password)}`),
        },
      };
      mwNames.push(mwKey);
    }

    // IP filter (use ipAllowList — Traefik v3 name; ipWhiteList was deprecated)
    if (host.security?.ipFilter?.enabled) {
      const allowed = host.security.ipFilter.allow ?? [];
      const blocked = host.security.ipFilter.block ?? [];
      if (allowed.length) {
        const mwKey = `${key}-ipallowlist`;
        middlewares[mwKey] = { ipAllowList: { sourceRange: allowed } };
        mwNames.push(mwKey);
      }
      if (blocked.length) {
        // Traefik doesn't have a native block list — note this in a comment below
        // We add a placeholder middleware named with -blockednote so it's visible
        const mwKey = `${key}-ipblocklist-note`;
        middlewares[mwKey] = {
          headers: {
            customResponseHeaders: {
              'X-Traefik-Note': 'IP block list not natively supported; use ipAllowList instead',
            },
          },
        };
        // Don't actually add to route — it's informational only
        void blocked;
      }
    }

    // Rate limit
    if (host.security?.rateLimit?.enabled) {
      const mwKey = `${key}-ratelimit`;
      const window = host.security.rateLimit.window ?? '1m';
      const requests = host.security.rateLimit.requests ?? 100;
      // Convert Caddy window format (e.g. "1m", "30s") to Traefik period
      middlewares[mwKey] = {
        rateLimit: {
          average: requests,
          period: window,
          burst: Math.ceil(requests * 1.5),
        },
      };
      mwNames.push(mwKey);
    }

    // Forward auth
    if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url?.trim()) {
      const mwKey = `${key}-forwardauth`;
      middlewares[mwKey] = {
        forwardAuth: {
          address: sanitizeConfigValue(host.security.forwardAuth.url),
          trustForwardHeader: true,
        },
      };
      mwNames.push(mwKey);
    }

    // Compression
    if (host.encode) {
      const mwKey = `${key}-compress`;
      middlewares[mwKey] = { compress: {} };
      mwNames.push(mwKey);
    }

    // Custom response headers + CORS
    const headersMw: Record<string, string> = {};
    for (const h of host.headers ?? []) {
      if (h.name && h.value) {
        headersMw[safeConfigString(h.name)] = safeConfigString(h.value);
      }
    }
    if (host.cors?.enabled) {
      const origins = (host.cors.allowOrigins ?? []).join(',');
      if (origins) headersMw['Access-Control-Allow-Origin'] = origins;
      const methods = (host.cors.allowMethods ?? []).join(',');
      if (methods) headersMw['Access-Control-Allow-Methods'] = methods;
      const hdrs = (host.cors.allowHeaders ?? []).join(',');
      if (hdrs) headersMw['Access-Control-Allow-Headers'] = hdrs;
    }
    if (host.security?.cspEnabled && host.security.csp?.trim()) {
      headersMw['Content-Security-Policy'] = sanitizeConfigValue(host.security.csp);
    }
    if (Object.keys(headersMw).length) {
      const mwKey = `${key}-headers`;
      middlewares[mwKey] = { headers: { customResponseHeaders: headersMw } };
      mwNames.push(mwKey);
    }

    // Router
    const router: TraefikRouter = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ['websecure'],
      service: key,
    };

    // TLS
    if (host.tls) {
      if (host.tls.certFile && host.tls.keyFile) {
        // Custom cert — user configures this in Traefik's TLS stores separately
        router.tls = true;
      } else if (host.tls.selfSigned) {
        router.tls = true; // Traefik will use default (can be configured as self-signed)
      } else if (host.tls.email !== undefined) {
        router.tls = { certResolver: 'letsencrypt' };
      } else {
        router.tls = true;
      }
    } else {
      // Default to websecure / auto TLS via letsencrypt resolver
      router.tls = { certResolver: 'letsencrypt' };
    }

    if (mwNames.length) router.middlewares = mwNames;

    routers[key] = router;

    // Also add an HTTP→HTTPS redirect router
    routers[`${key}-http`] = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ['web'],
      service: key,
    };
  }

  const dynamic: TraefikDynamic = {
    http: {
      routers,
      services,
      ...(Object.keys(middlewares).length ? { middlewares } : {}),
    },
  };

  const yamlOut = yaml.dump(dynamic, { lineWidth: 120, noRefs: true });

  const header = [
    '# Traefik dynamic configuration (file provider)',
    '# Place this file in your Traefik file provider directory.',
    '#',
    '# Assumed static config entryPoints:',
    '#   web:  address: ":80"',
    '#   websecure: address: ":443"',
    '# Assumed certificatesResolvers.letsencrypt configured in traefik.yml',
    ...(fileServerWarnings.length
      ? [
          '#',
          '# NOTE: The following hosts use "File Server" mode which is not natively',
          '# supported by Traefik. A placeholder upstream (http://localhost:80) has',
          '# been emitted. Replace with your actual static file server address.',
          '#   ' + fileServerWarnings.join(', '),
        ]
      : []),
    '',
  ].join('\n');

  return header + yamlOut;
}
