import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../lib/auth-store';
import { userApi } from '../lib/api';

/**
 * Authenticated home screen. M2 placeholder — shows the user's identity to
 * confirm the auth round-trip works end-to-end. Real product list arrives in M4.
 */
export default function HomeScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const localUser = useAuthStore((s) => s.user);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: userApi.me,
  });

  const display = meQuery.data?.phone ?? localUser?.phone ?? '?';
  const phoneFormatted = display.startsWith('+82') ? `0${display.slice(3)}` : display;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>살림</Text>
        <Text style={styles.subtitle}>한 집의 가전을 한 곳에</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>로그인됨</Text>
          <Text style={styles.cardValue}>{phoneFormatted}</Text>
          {meQuery.data?.defaultHouseholdId ? (
            <Text style={styles.cardMeta}>가구 ID: {meQuery.data.defaultHouseholdId}</Text>
          ) : null}
        </View>

        <Pressable style={styles.signOut} onPress={() => void signOut()}>
          <Text style={styles.signOutLabel}>로그아웃</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 56, fontWeight: '700', color: '#111111', letterSpacing: -1 },
  subtitle: { marginTop: 12, fontSize: 16, color: '#666666' },
  card: {
    marginTop: 48,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    minWidth: 240,
  },
  cardLabel: { fontSize: 12, color: '#888888' },
  cardValue: { marginTop: 4, fontSize: 18, fontWeight: '600', color: '#111111' },
  cardMeta: { marginTop: 6, fontSize: 11, color: '#aaaaaa' },
  signOut: { marginTop: 32, paddingVertical: 8, paddingHorizontal: 16 },
  signOutLabel: { color: '#666666', fontSize: 14, textDecorationLine: 'underline' },
});
