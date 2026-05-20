import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    setEmailError('');
    const t = email.trim();
    if (!t) { setEmailError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) { setEmailError('Please enter a valid email address.'); return; }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(t);
    setLoading(false);
    setStep('code');
    startCooldown();
  };

  const handleVerify = async () => {
    const t = code.replace(/\D/g, '');
    if (t.length !== 6) { setCodeError('Please enter the 6-digit code.'); return; }
    setCodeError('');
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: t, type: 'recovery' });
    setLoading(false);
    if (error) { setCodeError('Invalid or expired code. Please try again.'); return; }
    navigation.navigate('ResetPassword');
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    startCooldown();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.logo}>📸</Text>
            <Text style={styles.appName}>Momento</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forgot Password</Text>

            {step === 'email' ? (
              <>
                <Text style={styles.subtitle}>Enter your email and we'll send you a 6-digit code.</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={v => { setEmail(v); setEmailError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  If an account exists for {email.trim()}, a 6-digit code was sent.
                </Text>
                <View style={styles.field}>
                  <Text style={styles.label}>6-Digit Code</Text>
                  {!!codeError && <Text style={styles.fieldError}>{codeError}</Text>}
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    value={code}
                    onChangeText={v => { setCode(v.replace(/\D/g, '')); setCodeError(''); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
                </Pressable>
                <View style={styles.resendRow}>
                  <Pressable onPress={handleResend} disabled={cooldown > 0 || loading}>
                    <Text style={[styles.link, (cooldown > 0 || loading) && styles.linkDisabled]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </Text>
                  </Pressable>
                  <Text style={styles.dot}> · </Text>
                  <Pressable onPress={() => { setStep('email'); setCode(''); setCodeError(''); }}>
                    <Text style={styles.link}>Change email</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Remember your password? </Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Log In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FF6B6B' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: '#FF6B6B', alignItems: 'center', paddingTop: 48, paddingBottom: 40, paddingHorizontal: 24 },
  backBtn: { position: 'absolute', top: 16, left: 20, padding: 4 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  logo: { fontSize: 48, marginBottom: 12 },
  appName: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1, marginBottom: 6 },
  card: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },
  cardTitle: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },
  codeInput: { letterSpacing: 6, fontSize: 22, textAlign: 'center' },
  button: { backgroundColor: '#FF6B6B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  dot: { color: '#6B7280', fontSize: 15 },
  fieldError: { color: '#FF3B30', fontSize: 13, marginBottom: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#6B7280', fontSize: 15 },
  link: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  linkDisabled: { color: '#9CA3AF' },
});
