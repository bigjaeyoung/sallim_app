import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store. We use this for the JWT pair only;
 * everything else can live in regular AsyncStorage / Zustand persist.
 *
 * On iOS this hits the Keychain; on Android it hits EncryptedSharedPreferences.
 * The simulator has limitations — values persist across reloads but not
 * across simulator data wipes (which is fine for dev).
 */
const KEYS = {
  accessToken: 'sallim.accessToken',
  refreshToken: 'sallim.refreshToken',
} as const;

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, access),
    SecureStore.setItemAsync(KEYS.refreshToken, refresh),
  ]);
}

export async function loadTokens(): Promise<{ access: string | null; refresh: string | null }> {
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
  ]);
  return { access, refresh };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
  ]);
}
