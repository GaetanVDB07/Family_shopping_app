export const DEV_API_SLOW_REQUEST_MS: number;

export function shouldLogDevApiResponseBody(
  statusCode: number,
  durationMs: number,
): boolean;

export function formatDevApiResponseLogSuffix(
  statusCode: number,
  durationMs: number,
  responseBody: unknown,
): string;

export function sanitizeHeadersForLog(
  headers?: Record<string, unknown>,
): Record<string, unknown>;

export function sanitizeBodyForLog(body: unknown): unknown;
