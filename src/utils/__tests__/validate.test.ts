import { describe, it, expect } from 'vitest';
import { validateHosts } from '../validate';
import type { CaddyHost } from '../../types/caddy';

function makeProxy(domain: string, reverseProxy = 'http://localhost:3000'): CaddyHost {
  return { id: '1', domain, reverseProxy, encode: false };
}

function makeFileServer(domain: string, root = '/var/www'): CaddyHost {
  return { id: '1', domain, fileServer: { root, browse: false, php: false, frankenphp: false, hide: [] } };
}

describe('validateHosts', () => {
  it('returns no issues for a valid reverse proxy host', () => {
    const issues = validateHosts([makeProxy('example.com')]);
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for a valid file server host', () => {
    const issues = validateHosts([makeFileServer('static.example.com')]);
    expect(issues).toHaveLength(0);
  });

  it('errors on empty domain', () => {
    const issues = validateHosts([makeProxy('')]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('empty'))).toBe(true);
  });

  it('errors on domain with whitespace', () => {
    const issues = validateHosts([makeProxy('example .com')]);
    expect(issues.some(i => i.message.includes('whitespace'))).toBe(true);
  });

  it('errors on duplicate domains', () => {
    const issues = validateHosts([makeProxy('example.com'), makeProxy('example.com')]);
    expect(issues.some(i => i.message.includes('Duplicate'))).toBe(true);
  });

  it('errors when reverse proxy target is empty', () => {
    const host: CaddyHost = { id: '1', domain: 'example.com', encode: false };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('empty'))).toBe(true);
  });

  it('warns when proxy target is not a URL', () => {
    const issues = validateHosts([makeProxy('example.com', 'localhost:3000')]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes("doesn't start with http"))).toBe(true);
  });

  it('errors on empty file server root', () => {
    const issues = validateHosts([makeFileServer('example.com', '')]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('root'))).toBe(true);
  });

  it('errors when cert file set without key file', () => {
    const host: CaddyHost = { ...makeProxy('example.com'), tls: { certFile: 'cert.pem' } };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('key file'))).toBe(true);
  });

  it('errors when key file set without cert file', () => {
    const host: CaddyHost = { ...makeProxy('example.com'), tls: { keyFile: 'key.pem' } };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('cert file'))).toBe(true);
  });

  it('warns on multiple TLS modes', () => {
    const host: CaddyHost = { ...makeProxy('example.com'), tls: { email: 'a@b.com', selfSigned: true } };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes('Multiple TLS'))).toBe(true);
  });

  it('warns when IP filter enabled with no IPs', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      security: {
        ipFilter: { enabled: true, allow: [], block: [] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        cspEnabled: false, csp: '',
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes('no IPs'))).toBe(true);
  });

  it('warns on invalid CIDR', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      security: {
        ipFilter: { enabled: true, allow: ['not-an-ip'], block: [] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        cspEnabled: false, csp: '',
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes("doesn't look like"))).toBe(true);
  });

  it('errors on rate limit count < 1', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      security: {
        ipFilter: { enabled: false, allow: [], block: [] },
        rateLimit: { enabled: true, requests: 0, window: '1m' },
        cspEnabled: false, csp: '',
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('at least 1'))).toBe(true);
  });

  it('warns on invalid rate limit window', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      security: {
        ipFilter: { enabled: false, allow: [], block: [] },
        rateLimit: { enabled: true, requests: 10, window: '2min' },
        cspEnabled: false, csp: '',
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes('window'))).toBe(true);
  });

  it('errors on forward auth with no URL', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      security: {
        ipFilter: { enabled: false, allow: [], block: [] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        cspEnabled: false, csp: '',
        forwardAuth: { enabled: true, url: '' },
      },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'error' && i.message.includes('auth URL'))).toBe(true);
  });

  it('warns on CORS enabled with no origins', () => {
    const host: CaddyHost = {
      ...makeProxy('example.com'),
      cors: { enabled: true, allowOrigins: [], allowMethods: [], allowHeaders: [] },
    };
    const issues = validateHosts([host]);
    expect(issues.some(i => i.type === 'warning' && i.message.includes('origins'))).toBe(true);
  });
});
