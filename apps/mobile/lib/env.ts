// Read EXPO_PUBLIC_* env vars with sensible local-dev defaults.
//
// In production these are set in EAS secrets / app config; locally they
// come from apps/mobile/.env (loaded by Expo automatically).

export const API_URL =
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000';
