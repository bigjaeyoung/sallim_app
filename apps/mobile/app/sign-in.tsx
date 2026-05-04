import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authApi, ApiError } from '../lib/api';

/**
 * Korean mobile numbers are entered as digits (e.g. 01012345678) for UX.
 * We convert to E.164 (+82-prefixed, leading 0 stripped) before hitting the
 * API, which expects the canonical format.
 */
function toE164(local: string): string | null {
  const digits = local.replace(/\D/g, '');
  if (!/^01\d{8,9}$/.test(digits)) return null;
  return `+82${digits.slice(1)}`;
}

export default function SignInScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(null);
    const e164 = toE164(phone);
    if (!e164) {
      setError('휴대폰 번호 형식이 올바르지 않아요. 예: 01012345678');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.sendOtp(e164);
      router.push({ pathname: '/otp', params: { phone: e164 } });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '문자 전송에 실패했어요. 잠시 후 다시 시도해주세요.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>살림</Text>
          <Text style={styles.subtitle}>휴대폰 번호로 시작</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="01012345678"
              placeholderTextColor="#bbbbbb"
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
              autoFocus
              editable={!submitting}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!phone || submitting) && styles.buttonDisabled]}
            disabled={!phone || submitting}
            onPress={() => void onSubmit()}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonLabel}>인증번호 받기</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            번호로 6자리 인증번호가 문자로 옵니다.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  brand: { fontSize: 36, fontWeight: '700', color: '#111111', letterSpacing: -1 },
  subtitle: { marginTop: 8, fontSize: 16, color: '#666666' },
  inputWrap: { marginTop: 40 },
  input: {
    fontSize: 22,
    fontWeight: '500',
    color: '#111111',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  error: { marginTop: 16, color: '#cc2222', fontSize: 14 },
  button: {
    marginTop: 32,
    backgroundColor: '#111111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#cccccc' },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  hint: { marginTop: 16, fontSize: 13, color: '#888888' },
});
