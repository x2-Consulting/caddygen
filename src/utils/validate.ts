import type { CaddyHost } from '../types/caddy';

export interface ValidationIssue {
  type: 'error' | 'warning';
  domain: string;
  message: string;
}

const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
const RATE_WINDOW_RE = /^\d+[smhd]$/;
const PROXY_URL_RE = /^https?:\/\/.+/;

function isValidCidr(value: string): boolean {
  return CIDR_RE.test(value.trim());
}

export function validateHosts(hosts: CaddyHost[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenDomains = new Map<string, number>();

  for (const host of hosts) {
    const d = host.domain?.trim() || '(empty domain)';

    // --- Domain ---
    if (!host.domain?.trim()) {
      issues.push({ type: 'error', domain: d, message: 'Domain is empty.' });
    } else {
      if (/\s/.test(host.domain)) {
        issues.push({ type: 'error', domain: d, message: 'Domain contains whitespace.' });
      }
      const count = (seenDomains.get(host.domain) ?? 0) + 1;
      seenDomains.set(host.domain, count);
      if (count === 2) {
        issues.push({ type: 'error', domain: d, message: 'Duplicate domain — this will produce an invalid Caddyfile.' });
      }
    }

    // --- Reverse proxy ---
    if (!host.fileServer) {
      if (!host.reverseProxy?.trim()) {
        issues.push({ type: 'error', domain: d, message: 'Reverse proxy target is empty.' });
      } else if (!PROXY_URL_RE.test(host.reverseProxy.trim())) {
        issues.push({ type: 'warning', domain: d, message: `Proxy target "${host.reverseProxy}" doesn't start with http:// or https://.` });
      }
    }

    // --- File server ---
    if (host.fileServer) {
      if (!host.fileServer.root?.trim()) {
        issues.push({ type: 'error', domain: d, message: 'File server root directory is empty.' });
      }
    }

    // --- TLS ---
    if (host.tls) {
      const { email, selfSigned, certFile, keyFile } = host.tls;
      const hasCertPath = certFile?.trim() && keyFile?.trim();
      const modes = [!!email?.trim(), !!selfSigned, !!hasCertPath].filter(Boolean).length;
      if (modes > 1) {
        issues.push({ type: 'warning', domain: d, message: 'Multiple TLS modes are set (email, self-signed, cert file). Only one will be used.' });
      }
      if (certFile?.trim() && !keyFile?.trim()) {
        issues.push({ type: 'error', domain: d, message: 'TLS cert file is set but key file is missing.' });
      }
      if (keyFile?.trim() && !certFile?.trim()) {
        issues.push({ type: 'error', domain: d, message: 'TLS key file is set but cert file is missing.' });
      }
    }

    // --- Security ---
    if (host.security) {
      const { ipFilter, rateLimit, forwardAuth } = host.security;

      if (ipFilter?.enabled) {
        const allIps = [...(ipFilter.allow ?? []), ...(ipFilter.block ?? [])];
        if (allIps.length === 0) {
          issues.push({ type: 'warning', domain: d, message: 'IP filtering is enabled but no IPs are listed.' });
        }
        for (const ip of allIps) {
          if (!isValidCidr(ip)) {
            issues.push({ type: 'warning', domain: d, message: `IP filter entry "${ip}" doesn't look like a valid IP or CIDR range.` });
          }
        }
      }

      if (rateLimit?.enabled) {
        if (!rateLimit.requests || rateLimit.requests < 1) {
          issues.push({ type: 'error', domain: d, message: 'Rate limit request count must be at least 1.' });
        }
        if (!RATE_WINDOW_RE.test(rateLimit.window ?? '')) {
          issues.push({ type: 'warning', domain: d, message: `Rate limit window "${rateLimit.window}" should be in the format: 30s, 1m, 1h.` });
        }
      }

      if (forwardAuth?.enabled && !forwardAuth.url?.trim()) {
        issues.push({ type: 'error', domain: d, message: 'Forward authentication is enabled but the auth URL is empty.' });
      }
    }

    // --- CORS ---
    if (host.cors?.enabled && !host.cors.allowOrigins?.length) {
      issues.push({ type: 'warning', domain: d, message: 'CORS is enabled but no allowed origins are specified.' });
    }
  }

  return issues;
}
