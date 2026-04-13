import type { CaddyHost } from '../types/caddy';

function domainToServerName(domain: string): { listen: string; serverName: string | null } {
  // Port-only address like :8080
  if (domain.startsWith(':')) {
    return { listen: domain.slice(1), serverName: null };
  }
  return { listen: '80', serverName: domain };
}

export function generateNginxConfig(hosts: CaddyHost[]): string {
  return hosts.map(host => generateServerBlock(host)).join('\n\n');
}

function generateServerBlock(host: CaddyHost): string {
  const lines: string[] = [];
  const { listen, serverName } = domainToServerName(host.domain);

  if (host.presetName) {
    lines.push(`# ${host.presetName}`);
  }

  // Rate limit zone must be declared in http {} block — emit a reminder comment
  if (host.security?.rateLimit?.enabled) {
    lines.push(`# NOTE: Add the following to your http {} block:`);
    lines.push(`# limit_req_zone $binary_remote_addr zone=${sanitizeZoneName(host.domain)}:10m rate=${host.security.rateLimit.requests}r/${host.security.rateLimit.window};`);
  }

  lines.push(`server {`);

  // Listen directives
  const hasTls = !!(host.tls?.email || host.tls?.selfSigned || (host.tls?.certFile && host.tls?.keyFile));
  if (hasTls) {
    lines.push(`    listen 443 ssl;`);
    lines.push(`    listen [::]:443 ssl;`);
  } else {
    lines.push(`    listen ${listen};`);
    lines.push(`    listen [::]:${listen};`);
  }

  if (serverName) {
    lines.push(`    server_name ${serverName};`);
  }

  // TLS
  if (hasTls) {
    lines.push(``);
    if (host.tls?.certFile && host.tls?.keyFile) {
      lines.push(`    ssl_certificate ${host.tls.certFile};`);
      lines.push(`    ssl_certificate_key ${host.tls.keyFile};`);
    } else if (host.tls?.email && serverName) {
      lines.push(`    # TLS managed by certbot (Let's Encrypt) for ${host.tls.email}`);
      lines.push(`    ssl_certificate /etc/letsencrypt/live/${serverName}/fullchain.pem;`);
      lines.push(`    ssl_certificate_key /etc/letsencrypt/live/${serverName}/privkey.pem;`);
    } else if (host.tls?.selfSigned) {
      lines.push(`    # Self-signed certificate — generate with:`);
      lines.push(`    # openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/selfsigned.key -out /etc/ssl/certs/selfsigned.crt`);
      lines.push(`    ssl_certificate /etc/ssl/certs/selfsigned.crt;`);
      lines.push(`    ssl_certificate_key /etc/ssl/private/selfsigned.key;`);
    }
    lines.push(`    ssl_protocols TLSv1.2 TLSv1.3;`);
    lines.push(`    ssl_prefer_server_ciphers off;`);
  }

  // Compression
  if (host.encode || host.performance?.brotli) {
    lines.push(``);
    lines.push(`    gzip on;`);
    lines.push(`    gzip_vary on;`);
    lines.push(`    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;`);
    if (host.performance?.brotli) {
      lines.push(`    # Brotli requires the ngx_brotli module: https://github.com/google/ngx_brotli`);
      lines.push(`    # brotli on;`);
      lines.push(`    # brotli_types text/plain text/css application/json application/javascript;`);
    }
  }

  // Security headers
  if (host.security?.cspEnabled && host.security?.csp?.trim()) {
    lines.push(``);
    lines.push(`    add_header Content-Security-Policy "${host.security.csp}";`);
  }

  // CORS headers
  if (host.cors?.enabled && host.cors.allowOrigins?.length) {
    lines.push(``);
    lines.push(`    add_header Access-Control-Allow-Origin "${host.cors.allowOrigins.join(' ')}";`);
    if (host.cors.allowMethods?.length) {
      lines.push(`    add_header Access-Control-Allow-Methods "${host.cors.allowMethods.join(',')}";`);
    }
    if (host.cors.allowHeaders?.length) {
      lines.push(`    add_header Access-Control-Allow-Headers "${host.cors.allowHeaders.join(',')}";`);
    }
  }

  // Cache control
  if (host.performance?.cacheControlEnabled && host.performance?.cacheControl?.trim()) {
    lines.push(``);
    lines.push(`    add_header Cache-Control "${host.performance.cacheControl}";`);
  }

  // Custom headers
  if (host.headers?.length) {
    lines.push(``);
    host.headers.forEach(({ name, value }) => {
      lines.push(`    add_header ${name} "${value}";`);
    });
  }

  // IP filtering
  if (host.security?.ipFilter?.enabled) {
    const { allow, block } = host.security.ipFilter;
    if (allow?.length || block?.length) {
      lines.push(``);
      allow?.forEach(ip => lines.push(`    allow ${ip};`));
      block?.forEach(ip => lines.push(`    deny ${ip};`));
      if (allow?.length) {
        lines.push(`    deny all;`);
      }
    }
  }

  // Rate limiting
  if (host.security?.rateLimit?.enabled) {
    lines.push(``);
    lines.push(`    limit_req zone=${sanitizeZoneName(host.domain)} burst=20 nodelay;`);
  }

  // Forward auth
  if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url) {
    lines.push(``);
    lines.push(`    auth_request /auth-verify;`);
    if (host.security.forwardAuth.verifyHeader) {
      lines.push(`    auth_request_set $auth_header $upstream_http_${toNginxVar(host.security.forwardAuth.verifyHeader)};`);
      lines.push(`    proxy_set_header ${host.security.forwardAuth.verifyHeader} $auth_header;`);
    }
  }

  // Basic auth
  if (host.basicAuth?.length) {
    lines.push(``);
    lines.push(`    auth_basic "Restricted";`);
    lines.push(`    auth_basic_user_file /etc/nginx/.htpasswd;`);
    lines.push(`    # Generate .htpasswd entries with: htpasswd -nB <username>`);
  }

  // Main location block
  lines.push(``);
  lines.push(`    location / {`);

  if (host.fileServer) {
    lines.push(`        root ${host.fileServer.root};`);
    if (host.fileServer.php) {
      lines.push(`        index index.php index.html;`);
      lines.push(`        try_files $uri $uri/ /index.php?$query_string;`);
    } else {
      lines.push(`        index index.html index.htm;`);
      lines.push(`        try_files $uri $uri/ =404;`);
    }
    if (host.fileServer.browse) {
      lines.push(`        autoindex on;`);
    }
    if (host.fileServer.hide?.length) {
      host.fileServer.hide.forEach(pattern => {
        lines.push(`        location ~ ${pattern} { deny all; }`);
      });
    }
  } else if (host.reverseProxy) {
    lines.push(`        proxy_pass ${host.reverseProxy};`);
    lines.push(`        proxy_http_version 1.1;`);
    lines.push(`        proxy_set_header Upgrade $http_upgrade;`);
    lines.push(`        proxy_set_header Connection "upgrade";`);
    lines.push(`        proxy_set_header Host $host;`);
    lines.push(`        proxy_set_header X-Real-IP $remote_addr;`);
    lines.push(`        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`);
    lines.push(`        proxy_set_header X-Forwarded-Proto $scheme;`);
  }

  lines.push(`    }`);

  // PHP-FPM block (if file server + PHP)
  if (host.fileServer?.php) {
    lines.push(``);
    lines.push(`    location ~ \\.php$ {`);
    lines.push(`        fastcgi_pass unix:/run/php/php-fpm.sock;`);
    lines.push(`        fastcgi_index index.php;`);
    lines.push(`        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;`);
    lines.push(`        include fastcgi_params;`);
    lines.push(`    }`);
  }

  // Forward auth verify location
  if (host.security?.forwardAuth?.enabled && host.security.forwardAuth.url) {
    lines.push(``);
    lines.push(`    location = /auth-verify {`);
    lines.push(`        internal;`);
    lines.push(`        proxy_pass ${host.security.forwardAuth.url};`);
    lines.push(`        proxy_pass_request_body off;`);
    lines.push(`        proxy_set_header Content-Length "";`);
    lines.push(`        proxy_set_header X-Original-URI $request_uri;`);
    lines.push(`    }`);
  }

  lines.push(`}`);

  // HTTP → HTTPS redirect block
  if (hasTls && serverName) {
    lines.push(``);
    lines.push(`server {`);
    lines.push(`    listen 80;`);
    lines.push(`    listen [::]:80;`);
    lines.push(`    server_name ${serverName};`);
    lines.push(`    return 301 https://$host$request_uri;`);
    lines.push(`}`);
  }

  return lines.join('\n');
}

function sanitizeZoneName(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'default';
}

function toNginxVar(header: string): string {
  return header.toLowerCase().replace(/-/g, '_');
}
