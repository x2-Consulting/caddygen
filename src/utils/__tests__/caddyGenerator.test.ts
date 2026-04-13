import { describe, it, expect } from 'vitest';
import { generateCaddyConfig, generateGlobalBlock } from '../caddyGenerator';
import type { CaddyHost, CaddyGlobalOptions } from '../../types/caddy';

function proxy(domain: string, target = 'http://localhost:3000'): CaddyHost {
  return { id: '1', domain, reverseProxy: target, encode: false };
}

describe('generateGlobalBlock', () => {
  it('emits email', () => {
    const block = generateGlobalBlock({ email: 'admin@example.com' });
    expect(block).toContain('email admin@example.com');
  });

  it('emits admin', () => {
    const block = generateGlobalBlock({ admin: 'off' });
    expect(block).toContain('admin off');
  });

  it('emits acme_ca', () => {
    const block = generateGlobalBlock({ acmeCa: 'https://acme.zerossl.com/v2/DV90' });
    expect(block).toContain('acme_ca https://acme.zerossl.com/v2/DV90');
  });

  it('emits debug', () => {
    const block = generateGlobalBlock({ debug: true });
    expect(block).toContain('debug');
  });

  it('omits falsy options', () => {
    const block = generateGlobalBlock({ email: '', debug: false });
    expect(block).not.toContain('email');
    expect(block).not.toContain('debug');
  });
});

describe('generateCaddyConfig', () => {
  it('generates a reverse proxy block', () => {
    const out = generateCaddyConfig([proxy('example.com')]);
    expect(out).toContain('example.com {');
    expect(out).toContain('reverse_proxy http://localhost:3000');
    expect(out).toContain('}');
  });

  it('generates a file server block', () => {
    const host: CaddyHost = {
      id: '1', domain: 'static.example.com',
      fileServer: { root: '/var/www/html', browse: true, php: false, frankenphp: false, hide: [] },
    };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('root * /var/www/html');
    expect(out).toContain('file_server browse');
  });

  it('includes encode directive', () => {
    const host: CaddyHost = { ...proxy('example.com'), encode: true };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('encode');
  });

  it('includes brotli encode when performance.brotli is set', () => {
    const host: CaddyHost = { ...proxy('example.com'), performance: { brotli: true, cacheControlEnabled: false, cacheControl: '' } };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('encode zstd br gzip');
  });

  it('includes TLS email', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { email: 'admin@example.com' } };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('tls admin@example.com');
  });

  it('includes TLS internal for self-signed', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { selfSigned: true } };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('tls internal');
  });

  it('includes cert and key file paths', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { certFile: 'cert.pem', keyFile: 'key.pem' } };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('tls cert.pem key.pem');
  });

  it('includes CSP header', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      security: {
        cspEnabled: true, csp: "default-src 'self'",
        ipFilter: { enabled: false, allow: [], block: [] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('header Content-Security-Policy');
  });

  it('includes CORS headers', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      cors: { enabled: true, allowOrigins: ['https://app.example.com'], allowMethods: ['GET', 'POST'], allowHeaders: ['Authorization'] },
    };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('Access-Control-Allow-Origin');
    expect(out).toContain('Access-Control-Allow-Methods');
    expect(out).toContain('Access-Control-Allow-Headers');
  });

  it('includes basicauth block', () => {
    const host: CaddyHost = { ...proxy('example.com'), basicAuth: [{ username: 'alice', password: 'hashed' }] };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('basicauth *');
    expect(out).toContain('alice hashed');
  });

  it('includes custom headers', () => {
    const host: CaddyHost = { ...proxy('example.com'), headers: [{ name: 'X-Custom', value: 'hello' }] };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('header X-Custom "hello"');
  });

  it('includes rate limit', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      security: {
        cspEnabled: false, csp: '',
        ipFilter: { enabled: false, allow: [], block: [] },
        rateLimit: { enabled: true, requests: 50, window: '1m' },
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('rate_limit 50 1m');
  });

  it('includes IP filter block', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      security: {
        cspEnabled: false, csp: '',
        ipFilter: { enabled: true, allow: ['192.168.1.0/24'], block: ['10.0.0.0/8'] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const out = generateCaddyConfig([host]);
    expect(out).toContain('@blocked');
    expect(out).toContain('respond @blocked 403');
  });

  it('separates multiple hosts with blank lines', () => {
    const out = generateCaddyConfig([proxy('a.com'), proxy('b.com')]);
    expect(out).toContain('a.com {');
    expect(out).toContain('b.com {');
    expect(out.split('\n\n').length).toBeGreaterThanOrEqual(2);
  });

  it('prepends global block when options are provided', () => {
    const opts: CaddyGlobalOptions = { email: 'admin@example.com', admin: 'off' };
    const out = generateCaddyConfig([proxy('example.com')], opts);
    expect(out.startsWith('{')).toBe(true);
    expect(out).toContain('email admin@example.com');
    expect(out).toContain('admin off');
    expect(out).toContain('example.com {');
  });

  it('does not prepend global block when options are all empty', () => {
    const opts: CaddyGlobalOptions = { email: '', debug: false };
    const out = generateCaddyConfig([proxy('example.com')], opts);
    expect(out.startsWith('example.com')).toBe(true);
  });
});
