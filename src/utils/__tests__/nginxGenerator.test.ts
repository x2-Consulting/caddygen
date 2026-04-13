import { describe, it, expect } from 'vitest';
import { generateNginxConfig } from '../nginxGenerator';
import type { CaddyHost } from '../../types/caddy';

function proxy(domain: string, target = 'http://localhost:3000'): CaddyHost {
  return { id: '1', domain, reverseProxy: target, encode: false };
}

describe('generateNginxConfig', () => {
  it('generates a server block for a reverse proxy', () => {
    const out = generateNginxConfig([proxy('example.com')]);
    expect(out).toContain('server_name example.com');
    expect(out).toContain('proxy_pass http://localhost:3000');
  });

  it('generates an HTTP to HTTPS redirect block when TLS is set', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { email: 'admin@example.com' } };
    const out = generateNginxConfig([host]);
    expect(out).toContain('listen 443 ssl');
    expect(out).toContain('return 301 https://');
  });

  it('uses ssl_certificate paths for manual TLS', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { certFile: 'cert.pem', keyFile: 'key.pem' } };
    const out = generateNginxConfig([host]);
    expect(out).toContain('ssl_certificate cert.pem');
    expect(out).toContain('ssl_certificate_key key.pem');
  });

  it('uses certbot paths for email-based TLS', () => {
    const host: CaddyHost = { ...proxy('example.com'), tls: { email: 'admin@example.com' } };
    const out = generateNginxConfig([host]);
    expect(out).toContain('/etc/letsencrypt/live/example.com/fullchain.pem');
  });

  it('emits gzip for encode hosts', () => {
    const host: CaddyHost = { ...proxy('example.com'), encode: true };
    const out = generateNginxConfig([host]);
    expect(out).toContain('gzip on');
  });

  it('generates a file server block with autoindex', () => {
    const host: CaddyHost = {
      id: '1', domain: 'static.example.com',
      fileServer: { root: '/var/www/html', browse: true, php: false, frankenphp: false, hide: [] },
    };
    const out = generateNginxConfig([host]);
    expect(out).toContain('root /var/www/html');
    expect(out).toContain('autoindex on');
  });

  it('includes PHP-FPM location block', () => {
    const host: CaddyHost = {
      id: '1', domain: 'php.example.com',
      fileServer: { root: '/var/www/html', browse: false, php: true, frankenphp: false, hide: [] },
    };
    const out = generateNginxConfig([host]);
    expect(out).toContain('fastcgi_pass');
    expect(out).toContain('.php');
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
    const out = generateNginxConfig([host]);
    expect(out).toContain('Content-Security-Policy');
  });

  it('includes CORS headers', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      cors: { enabled: true, allowOrigins: ['https://app.example.com'], allowMethods: ['GET'], allowHeaders: [] },
    };
    const out = generateNginxConfig([host]);
    expect(out).toContain('Access-Control-Allow-Origin');
  });

  it('includes cache control header', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      performance: { brotli: false, cacheControlEnabled: true, cacheControl: 'public, max-age=3600' },
    };
    const out = generateNginxConfig([host]);
    expect(out).toContain('Cache-Control');
    expect(out).toContain('public, max-age=3600');
  });

  it('includes IP allow/deny rules', () => {
    const host: CaddyHost = {
      ...proxy('example.com'),
      security: {
        cspEnabled: false, csp: '',
        ipFilter: { enabled: true, allow: ['192.168.1.0/24'], block: ['10.0.0.0/8'] },
        rateLimit: { enabled: false, requests: 100, window: '1m' },
        forwardAuth: { enabled: false, url: '' },
      },
    };
    const out = generateNginxConfig([host]);
    expect(out).toContain('allow 192.168.1.0/24');
    expect(out).toContain('deny 10.0.0.0/8');
  });

  it('includes custom headers', () => {
    const host: CaddyHost = { ...proxy('example.com'), headers: [{ name: 'X-Custom', value: 'hello' }] };
    const out = generateNginxConfig([host]);
    expect(out).toContain('add_header X-Custom "hello"');
  });

  it('handles multiple hosts', () => {
    const out = generateNginxConfig([proxy('a.com'), proxy('b.com')]);
    expect(out).toContain('server_name a.com');
    expect(out).toContain('server_name b.com');
  });
});
