import { z } from 'zod';

/**
 * Health check response — used by both the API (to validate output) and the
 * mobile client (eventually, when we wire up startup connectivity checks).
 *
 * Keep small: this is the simplest possible cross-package contract, mainly
 * here to prove the type-sharing wiring works end-to-end in M1.
 */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string().optional(),
  uptime_s: z.number().nonnegative().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
