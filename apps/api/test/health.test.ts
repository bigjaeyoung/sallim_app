import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health/health.controller.js';
import { HealthResponseSchema } from '@sallim/shared';

describe('HealthController', () => {
  it('returns a schema-valid response', () => {
    const controller = new HealthController();
    const result = controller.check();
    expect(() => HealthResponseSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);
  });
});
