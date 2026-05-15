import { describe, expect, it } from 'vitest';
import { createListenOptions } from '../server/listen-options';

describe('createListenOptions', () => {
  it('omits reusePort on Windows', () => {
    expect(createListenOptions(5000, 'win32')).toEqual({
      port: 5000,
      host: '0.0.0.0',
    });
  });

  it('keeps reusePort on platforms that support it', () => {
    expect(createListenOptions(5000, 'linux')).toEqual({
      port: 5000,
      host: '0.0.0.0',
      reusePort: true,
    });
  });
});
