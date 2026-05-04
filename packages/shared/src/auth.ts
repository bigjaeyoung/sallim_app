import { z } from 'zod';

/**
 * Phone number in E.164 format. Korean mobile numbers are +82 + 9 or 10
 * digits after the leading 0 is stripped. We validate strictly to fail fast
 * on bad client input.
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164, e.g. +821012345678');

export const SendOtpRequestSchema = z.object({
  phone: PhoneSchema,
});
export type SendOtpRequest = z.infer<typeof SendOtpRequestSchema>;

export const SendOtpResponseSchema = z.object({
  ok: z.literal(true),
  channel: z.literal('sms'),
  expiresInSeconds: z.number().int().positive(),
});
export type SendOtpResponse = z.infer<typeof SendOtpResponseSchema>;

export const VerifyOtpRequestSchema = z.object({
  phone: PhoneSchema,
  code: z.string().regex(/^\d{4,8}$/, 'Code must be 4–8 digits'),
});
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequestSchema>;

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    defaultHouseholdId: z.string().nullable(),
  }),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
