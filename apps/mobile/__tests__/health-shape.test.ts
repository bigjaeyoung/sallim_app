import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@sallim/shared';

/**
 * Cross-package smoke test — proves the mobile workspace can import the
 * shared Zod schemas. The actual rendering of `app/index.tsx` is exercised by
 * Expo at runtime; here we keep things hermetic.
 */
describe('@sallim/shared interop', () => {
  it('mobile can import HealthResponseSchema and parse a response', () => {
    const parsed = HealthResponseSchema.parse({ ok: true });
    expect(parsed.ok).toBe(true);
  });
});
