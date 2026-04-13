/**
 * Sanitization helpers for config file generation.
 *
 * The app generates Caddyfile / nginx.conf text from user-supplied values.
 * Without sanitization, a user could inject newlines or unescaped quotes to
 * add arbitrary directives to the generated config.
 */

/** Remove CR/LF characters that would break a single-line config directive. */
export function sanitizeConfigValue(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

/**
 * Escape double-quotes and strip newlines — safe for use inside "" in a
 * Caddyfile or nginx.conf value.
 */
export function safeConfigString(value: string): string {
  return sanitizeConfigValue(value).replace(/"/g, '\\"');
}

/**
 * HTTP header names must only contain alphanumerics, hyphens, and underscores.
 * Rejects anything with newlines, spaces, semicolons, etc.
 */
export function isValidHeaderName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/** IP address or CIDR range — no whitespace allowed. */
const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
export function isValidIpOrCidr(value: string): boolean {
  const trimmed = value.trim();
  return CIDR_RE.test(trimmed) && !/\s/.test(trimmed);
}

/**
 * CORS origin must be a valid http/https URL with no embedded quotes or
 * newlines that would break a header directive.
 */
export function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !/[\r\n"'`]/.test(origin)
    );
  } catch {
    return false;
  }
}

/**
 * Validate the Caddy Admin API URL.
 * Only http/https to localhost or 127.x addresses is permitted to prevent
 * SSRF attacks against internal network services or cloud metadata endpoints.
 */
export function isValidCaddyAdminUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '::1' ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  } catch {
    return false;
  }
}
