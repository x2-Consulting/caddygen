import type { CaddyHost } from '../types/caddy';

export function generateCaddyConfig(hosts: CaddyHost[]): string {
  return hosts.map((host) => {
    const lines: string[] = [];
    if (host.presetName) lines.push(`# ${host.presetName}`);
    if (host.fileServer?.frankenphp) { lines.push('{'); lines.push('    frankenphp'); lines.push('}'); }
    lines.push(`${host.domain} {`);
    if (host.fileServer) {
      lines.push(`    root * ${host.fileServer.root}`);
      if (host.fileServer.frankenphp) { lines.push('    php_server'); }
      else if (host.fileServer.php) { lines.push('    php_fastcgi unix//run/php/php-fpm.sock'); }
      lines.push(`    file_server${host.fileServer.browse ? ' browse' : ''}`);
    } else if (host.reverseProxy) {
      lines.push(`    reverse_proxy ${host.reverseProxy}`);
    }
    if (host.performance?.brotli) { lines.push('    encode zstd br gzip'); }
    else if (host.encode) { lines.push('    encode'); }
    if (host.security?.cspEnabled && host.security?.csp?.trim()) lines.push(`    header Content-Security-Policy "${host.security.csp}"`);
    if (host.security?.ipFilter?.enabled && (host.security?.ipFilter?.allow?.length || host.security?.ipFilter?.block?.length)) {
      lines.push('    @blocked {');
      if (host.security.ipFilter.block?.length) lines.push(`        remote_ip ${host.security.ipFilter.block.join(' ')}`);
      if (host.security.ipFilter.allow?.length) lines.push(`        not remote_ip ${host.security.ipFilter.allow.join(' ')}`);
      lines.push('    }');
      lines.push('    respond @blocked 403');
    }
    if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url) {
      lines.push('    forward_auth * {');
      lines.push(`        uri ${host.security.forwardAuth.url}`);
      if (host.security.forwardAuth.verifyHeader && host.security.forwardAuth.verifyValue) {
        lines.push('        copy_headers {');
        lines.push(`            ${host.security.forwardAuth.verifyHeader} ${host.security.forwardAuth.verifyValue}`);
        lines.push('        }');
      }
      lines.push('    }');
    }
    if (host.security?.rateLimit?.enabled && host.security.rateLimit?.requests && host.security.rateLimit.window) {
      lines.push(`    rate_limit ${host.security.rateLimit.requests} ${host.security.rateLimit.window}`);
    }
    if (host.cors?.enabled && host.cors.allowOrigins?.length) {
      lines.push(`    header Access-Control-Allow-Origin "${host.cors.allowOrigins.join(' ')}"`);
      if (host.cors.allowMethods?.length) lines.push(`    header Access-Control-Allow-Methods "${host.cors.allowMethods.join(',')}"`);
      if (host.cors.allowHeaders?.length) lines.push(`    header Access-Control-Allow-Headers "${host.cors.allowHeaders.join(',')}"`);
    }
    if (host.performance?.cacheControlEnabled && host.performance?.cacheControl?.trim()) {
      lines.push(`    header Cache-Control "${host.performance.cacheControl}"`);
    }
    host.fileServer?.hide?.forEach(pattern => { lines.push('    file_server {'); lines.push(`        hide ${pattern}`); lines.push('    }'); });
    if (host.tls?.email) { lines.push(`    tls ${host.tls.email}`); }
    else if (host.tls?.selfSigned) { lines.push('    tls internal'); }
    else if (host.tls?.certFile && host.tls?.keyFile) { lines.push(`    tls ${host.tls.certFile} ${host.tls.keyFile}`); }
    if (host.basicAuth?.length) {
      host.basicAuth.forEach(({ username, password }) => { lines.push(`    basicauth * {`); lines.push(`        ${username} ${password}`); lines.push('    }'); });
    }
    if (host.headers?.length) {
      host.headers.forEach(({ name, value }) => lines.push(`    header ${name} "${value}"`));
    }
    lines.push('}');
    return lines.join('\n');
  }).join('\n\n');
}
