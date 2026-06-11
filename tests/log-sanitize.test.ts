import { describe, expect, it } from 'vitest';
import { sanitizeBodyForLog, sanitizeHeadersForLog } from '../shared/log-sanitize.js';

describe('sanitizeHeadersForLog', () => {
  it('redacts authorization headers case-insensitively', () => {
    expect(
      sanitizeHeadersForLog({
        Authorization: 'Bearer secret-token',
        'content-type': 'application/json',
      }),
    ).toEqual({
      Authorization: '[REDACTED]',
      'content-type': 'application/json',
    });
  });
});

describe('sanitizeBodyForLog', () => {
  it('redacts sensitive body fields', () => {
    expect(
      sanitizeBodyForLog({
        name: 'Milk',
        code: '123456',
        password: 'hunter2',
      }),
    ).toEqual({
      name: 'Milk',
      code: '[REDACTED]',
      password: '[REDACTED]',
    });
  });

  it('returns nullish bodies unchanged', () => {
    expect(sanitizeBodyForLog(null)).toBeNull();
    expect(sanitizeBodyForLog(undefined)).toBeUndefined();
  });
});
