import { describe, expect, it } from 'vitest';
import {
  formatDevApiResponseLogSuffix,
  sanitizeBodyForLog,
  sanitizeHeadersForLog,
  shouldLogDevApiResponseBody,
} from '../shared/log-sanitize.js';

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

describe('shouldLogDevApiResponseBody', () => {
  it('logs only failed or slow responses', () => {
    expect(shouldLogDevApiResponseBody(200, 120)).toBe(false);
    expect(shouldLogDevApiResponseBody(404, 12)).toBe(true);
    expect(shouldLogDevApiResponseBody(200, 500)).toBe(true);
  });
});

describe('formatDevApiResponseLogSuffix', () => {
  it('skips stringify for fast successful responses', () => {
    expect(formatDevApiResponseLogSuffix(200, 120, { items: [{ id: '1' }] })).toBe('');
  });

  it('includes sanitized bodies for errors and slow requests', () => {
    expect(formatDevApiResponseLogSuffix(500, 40, { message: 'fail', code: '123456' })).toBe(
      ' :: {"message":"fail","code":"[REDACTED]"}',
    );
    expect(formatDevApiResponseLogSuffix(200, 900, { items: [] })).toBe(' :: {"items":[]}');
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
