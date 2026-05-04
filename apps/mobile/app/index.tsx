import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

/**
 * M1 placeholder home screen.
 *
 * Goal: confirm the Expo + expo-router skeleton boots and renders. Real
 * content arrives in M2 (auth + household setup) and M4 (camera + product
 * listing). Keep this minimal so it stays out of the way.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>살림</Text>
        <Text style={styles.subtitle}>한 집의 가전을 한 곳에</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
});
