import type { CaddyHost, CaddyGlobalOptions } from '../types/caddy';
import { safeConfigString, sanitizeConfigValue, isValidHeaderName, isValidIpOrCidr, isValidOrigin } from './sanitize';

export function generateGlobalBlock(opts: CaddyGlobalOptions): string {
  const lines: string[] = ['{'];
  if (opts.email?.trim()) lines.push(`    email ${sanitizeConfigValue(opts.email)}`);
  if (opts.admin?.trim()) lines.push(`    admin ${sanitizeConfigValue(opts.admin)}`);
  if (opts.acmeCa?.trim()) lines.push(`    acme_ca ${sanitizeConfigValue(opts.acmeCa)}`);
  if (opts.debug) lines.push('    debug');
  lines.push('}');
  return lines.join('\n');
}

export function generateCaddyConfig(hosts: CaddyHost[], globalOptions?: CaddyGlobalOptions): string {
  const parts: string[] = [];
  if (globalOptions && Object.values(globalOptions).some(v => v !== undefined && v !== '' && v !== false)) {
    parts.push(generateGlobalBlock(globalOptions));
  }
  parts.push(...hosts.map((host) => {
    const lines: string[] = [];
    if (host.presetName) lines.push(`# ${sanitizeConfigValue(host.presetName)}`);
    if (host.fileServer?.frankenphp) { lines.push('{'); lines.push('    frankenphp'); lines.push('}'); }
    lines.push(`${sanitizeConfigValue(host.domain)} {`);
    if (host.fileServer) {
      lines.push(`    root * ${sanitizeConfigValue(host.fileServer.root)}`);
      if (host.fileServer.frankenphp) { lines.push('    php_server'); }
      else if (host.fileServer.php) { lines.push('    php_fastcgi unix//run/php/php-fpm.sock'); }
      lines.push(`    file_server${host.fileServer.browse ? ' browse' : ''}`);
    } else if (host.reverseProxy) {
      lines.push(`    reverse_proxy ${sanitizeConfigValue(host.reverseProxy)}`);
    }
    if (host.performance?.brotli) { lines.push('    encode zstd br gzip'); }
    else if (host.encode) { lines.push('    encode'); }
    if (host.security?.cspEnabled && host.security?.csp?.trim()) {
      lines.push(`    header Content-Security-Policy "${safeConfigString(host.security.csp)}"`);
    }
    if (host.security?.ipFilter?.enabled) {
      const validBlock = (host.security.ipFilter.block ?? []).filter(isValidIpOrCidr);
      const validAllow = (host.security.ipFilter.allow ?? []).filter(isValidIpOrCidr);
      if (validBlock.length || validAllow.length) {
        lines.push('    @blocked {');
        if (validBlock.length) lines.push(`        remote_ip ${validBlock.join(' ')}`);
        if (validAllow.length) lines.push(`        not remote_ip ${validAllow.join(' ')}`);
        lines.push('    }');
        lines.push('    respond @blocked 403');
      }
    }
    if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url) {
      lines.push('    forward_auth * {');
      lines.push(`        uri ${sanitizeConfigValue(host.security.forwardAuth.url)}`);
      if (host.security.forwardAuth.verifyHeader && host.security.forwardAuth.verifyValue) {
        const hdr = sanitizeConfigValue(host.security.forwardAuth.verifyHeader);
        const val = sanitizeConfigValue(host.security.forwardAuth.verifyValue);
        if (isValidHeaderName(hdr)) {
          lines.push('        copy_headers {');
          lines.push(`            ${hdr} ${val}`);
          lines.push('        }');
        }
      }
      lines.push('    }');
    }
    if (host.security?.rateLimit?.enabled && host.security.rateLimit?.requests && host.security.rateLimit.window) {
      lines.push(`    rate_limit ${host.security.rateLimit.requests} ${sanitizeConfigValue(host.security.rateLimit.window)}`);
    }
    if (host.cors?.enabled && host.cors.allowOrigins?.length) {
      const validOrigins = host.cors.allowOrigins.filter(isValidOrigin);
      if (validOrigins.length) {
        lines.push(`    header Access-Control-Allow-Origin "${validOrigins.map(safeConfigString).join(' ')}"`);
        if (host.cors.allowMethods?.length) {
          lines.push(`    header Access-Control-Allow-Methods "${host.cors.allowMethods.map(safeConfigString).join(',')}"`);
        }
        if (host.cors.allowHeaders?.length) {
          lines.push(`    header Access-Control-Allow-Headers "${host.cors.allowHeaders.map(safeConfigString).join(',')}"`);
        }
      }
    }
    if (host.performance?.cacheControlEnabled && host.performance?.cacheControl?.trim()) {
      lines.push(`    header Cache-Control "${safeConfigString(host.performance.cacheControl)}"`);
    }
    host.fileServer?.hide?.forEach(pattern => {
      const safe = sanitizeConfigValue(pattern);
      if (safe) { lines.push('    file_server {'); lines.push(`        hide ${safe}`); lines.push('    }'); }
    });
    if (host.tls?.email) { lines.push(`    tls ${sanitizeConfigValue(host.tls.email)}`); }
    else if (host.tls?.selfSigned) { lines.push('    tls internal'); }
    else if (host.tls?.certFile && host.tls?.keyFile) {
      lines.push(`    tls ${sanitizeConfigValue(host.tls.certFile)} ${sanitizeConfigValue(host.tls.keyFile)}`);
    }
    if (host.basicAuth?.length) {
      host.basicAuth.forEach(({ username, password }) => {
        const u = sanitizeConfigValue(username);
        const p = sanitizeConfigValue(password);
        if (u && p) {
          lines.push(`    basicauth * {`);
          lines.push(`        ${u} ${p}`);
          lines.push('    }');
        }
      });
    }
    if (host.headers?.length) {
      host.headers.forEach(({ name, value }) => {
        const safeName = sanitizeConfigValue(name);
        if (isValidHeaderName(safeName)) {
          lines.push(`    header ${safeName} "${safeConfigString(value)}"`);
        }
      });
    }
    lines.push('}');
    return lines.join('\n');
  }));
  return parts.join('\n\n');
}
