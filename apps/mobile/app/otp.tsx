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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authApi, ApiError } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const setSession = useAuthStore((s) => s.setSession);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    if (!phone) {
      setError('휴대폰 번호 정보가 없어요. 처음 화면으로 돌아가서 다시 시도해주세요.');
      return;
    }
    if (!/^\d{4,8}$/.test(code)) {
      setError('인증번호는 4~8자리 숫자입니다.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const session = await authApi.verifyOtp(phone, code);
      setSession(session);
      router.replace('/');
    } catch (err) {
      const msg = err instanceof ApiError ? '인증번호가 일치하지 않아요. 다시 확인해주세요.' : '확인에 실패했어요.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const display = phone.startsWith('+82') ? `0${phone.slice(3)}` : phone;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>인증번호 입력</Text>
          <Text style={styles.subtitle}>{display}로 보낸 6자리 코드</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor="#bbbbbb"
              value={code}
              onChangeText={setCode}
              maxLength={8}
              autoFocus
              editable={!submitting}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!code || submitting) && styles.buttonDisabled]}
            disabled={!code || submitting}
            onPress={() => void onSubmit()}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonLabel}>확인</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.linkRow}>
            <Text style={styles.link}>번호 다시 입력</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  brand: { fontSize: 28, fontWeight: '700', color: '#111111', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 14, color: '#666666' },
  inputWrap: { marginTop: 40 },
  input: {
    fontSize: 28,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    textAlign: 'center',
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
  linkRow: { marginTop: 24, alignItems: 'center' },
  link: { color: '#666666', fontSize: 14, textDecorationLine: 'underline' },
});
