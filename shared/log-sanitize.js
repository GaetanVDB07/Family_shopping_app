const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-cron-secret',
]);

const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'authorization',
  'code',
]);

export function sanitizeHeadersForLog(headers = {}) {
  const sanitized = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export function sanitizeBodyForLog(body) {
  if (body === undefined || body === null) {
    return body;
  }

  if (typeof body !== 'object') {
    return '[REDACTED]';
  }

  if (Array.isArray(body)) {
    return body.map((entry) => sanitizeBodyForLog(entry));
  }

  const sanitized = { ...body };

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_BODY_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBodyForLog(sanitized[key]);
    }
  }

  return sanitized;
}
