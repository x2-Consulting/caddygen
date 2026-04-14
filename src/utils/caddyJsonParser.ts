/**
 * Parse a Caddy v2 JSON config (as returned by GET /config/) into CaddyHost[].
 *
 * Caddy's JSON format nests handlers inside routes, often wrapped in a
 * "subroute" handler. This parser flattens those layers and extracts the
 * fields that CaddyGen knows how to represent.
 */

import type { CaddyHost } from '../types/caddy';
import { v4 as uuidv4 } from 'uuid';

/** Recursively collect all leaf handlers, unwrapping subroute/route nesting. */
function collectHandlers(handles: any[]): any[] {
  const result: any[] = [];
  for (const h of handles ?? []) {
    if (h?.handler === 'subroute' && Array.isArray(h.routes)) {
      for (const route of h.routes) {
        result.push(...collectHandlers(route.handle ?? []));
      }
    } else {
      result.push(h);
    }
  }
  return result;
}

export function parseCaddyJson(json: any): CaddyHost[] {
  const hosts: CaddyHost[] = [];

  const httpServers = json?.apps?.http?.servers;
  if (!httpServers || typeof httpServers !== 'object') return hosts;

  // Build a domain → TLS info map from the TLS automation policies
  const tlsMap = new Map<string, CaddyHost['tls']>();
  const tlsPolicies: any[] = json?.apps?.tls?.automation?.policies ?? [];
  for (const policy of tlsPolicies) {
    const subjects: string[] = policy.subjects ?? [];
    const issuers: any[] = policy.issuers ?? [];
    const isInternal = issuers.some((i: any) => i?.module === 'internal');
    const acme = issuers.find((i: any) => i?.module === 'acme' || i?.module === 'zerossl');
    for (const subject of subjects) {
      if (isInternal) {
        tlsMap.set(subject, { selfSigned: true });
      } else if (acme) {
        tlsMap.set(subject, { email: acme.email ?? '' });
      } else {
        tlsMap.set(subject, {});
      }
    }
  }

  for (const server of Object.values(httpServers) as any[]) {
    const routes: any[] = server?.routes ?? [];

    for (const route of routes) {
      // Collect all matched host names
      const matchedHosts: string[] = [];
      for (const m of route.match ?? []) {
        if (Array.isArray(m.host)) matchedHosts.push(...m.host);
      }
      if (!matchedHosts.length) continue;

      const domain = matchedHosts[0];
      const host: CaddyHost = { id: uuidv4(), domain, encode: false };

      // Apply TLS from automation policies
      if (tlsMap.has(domain)) {
        host.tls = { ...tlsMap.get(domain) };
      }

      // Flatten all handlers (including nested subroutes)
      const handlers = collectHandlers(route.handle ?? []);

      // Track file server root separately (set by "vars" handler in JSON)
      let fsRoot = '/';

      for (const handler of handlers) {
        switch (handler?.handler) {
          case 'vars': {
            if (typeof handler.root === 'string') fsRoot = handler.root;
            break;
          }
          case 'reverse_proxy': {
            const upstreams: any[] = handler.upstreams ?? [];
            const dial = upstreams[0]?.dial ?? '';
            if (dial) host.reverseProxy = dial;
            break;
          }
          case 'file_server': {
            if (!host.fileServer) {
              host.fileServer = { root: fsRoot, browse: false, php: false, frankenphp: false, hide: [] };
            }
            host.fileServer.root = fsRoot;
            host.fileServer.browse = !!handler.browse;
            if (Array.isArray(handler.hide)) host.fileServer.hide = handler.hide;
            break;
          }
          case 'encode': {
            host.encode = true;
            break;
          }
          case 'headers': {
            const setHeaders: Record<string, string[]> = handler?.response?.set ?? {};
            for (const [name, values] of Object.entries(setHeaders)) {
              if (Array.isArray(values) && values.length) {
                if (!host.headers) host.headers = [];
                host.headers.push({ name, value: values[0] });
              }
            }
            break;
          }
          case 'basicauth': {
            if (!host.basicAuth) host.basicAuth = [];
            const accounts: any[] = handler.accounts ?? [];
            if (accounts.length) {
              for (const acc of accounts) {
                host.basicAuth.push({ username: acc.username ?? '<imported>', password: '' });
              }
            } else {
              host.basicAuth.push({ username: '<imported>', password: '' });
            }
            break;
          }
          case 'forward_auth': {
            if (!host.security) {
              host.security = {
                ipFilter: { enabled: false, allow: [], block: [] },
                rateLimit: { enabled: false, requests: 100, window: '1m' },
                cspEnabled: false, csp: '',
                forwardAuth: { enabled: true, url: handler.uri ?? '', verifyHeader: '', verifyValue: '' },
              };
            } else {
              host.security.forwardAuth = { enabled: true, url: handler.uri ?? '', verifyHeader: '', verifyValue: '' };
            }
            break;
          }
          case 'rate_limit': {
            if (!host.security) {
              host.security = {
                ipFilter: { enabled: false, allow: [], block: [] },
                rateLimit: { enabled: true, requests: 100, window: '1m' },
                cspEnabled: false, csp: '',
                forwardAuth: { enabled: false, url: '', verifyHeader: '', verifyValue: '' },
              };
            } else {
              host.security.rateLimit.enabled = true;
            }
            break;
          }
        }
      }

      hosts.push(host);
    }
  }

  return hosts;
}
