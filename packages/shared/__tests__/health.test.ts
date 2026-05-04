import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '../src/health.js';

describe('HealthResponseSchema', () => {
  it('accepts the minimal { ok: true } shape', () => {
    const parsed = HealthResponseSchema.parse({ ok: true });
    expect(parsed.ok).toBe(true);
  });

  it('accepts version + uptime_s when present', () => {
    const parsed = HealthResponseSchema.parse({
      ok: true,
      version: '0.1.0',
      uptime_s: 12.5,
    });
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.uptime_s).toBe(12.5);
  });

  it('rejects ok: false (literal)', () => {
    expect(() => HealthResponseSchema.parse({ ok: false })).toThrow();
  });
});
