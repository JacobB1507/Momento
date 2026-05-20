import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { takePendingPhone } from '../../lib/pendingPhone';
import { guardOtpSend, checkOtpVerifyRateLimit } from '../../lib/rateLimit';

function formatPhoneDisplay(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

export default function PhoneVerificationScreen() {
  const { refreshProfile } = useAuth();
  const route = useRoute<any>();
  const [step, setStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [phoneDigits, setPhoneDigits] = useState<string>(() => {
    const pending = takePendingPhone();
    const fromParams = (route?.params?.phone ?? '').replace(/\D/g, '');
    return pending || fromParams;
  });
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendCode = async () => {
    const phone = '+1' + phoneDigits;

    // Client-side format validation
    if (!phone.startsWith('+') || phone.replace(/\D/g, '').length < 8) {
      setPhoneError('Please enter a valid phone number with country code, e.g. +15551234567');
      return;
    }

    setPhoneError(null);
    setLoading(true);

    // Check if phone is already registered (block signup-style reuse)
    const { data: exists, error: checkError } = await supabase.rpc('check_phone_exists', { phone_to_check: phone });
    if (checkError) {
      setLoading(false);
      setPhoneError('Could not verify phone number. Please try again.');
      return;
    }
    if (exists === true) {
      setLoading(false);
      setPhoneError('An account with this phone number already exists. Please sign in instead.');
      return;
    }

    // Rate-limit guard: runs before every OTP send (initial + resend paths both call sendCode)
    const guard = await guardOtpSend(phone);
    if (!guard.ok) {
      const msg =
        guard.reason === 'phone_hourly'
          ? 'Too many code requests for this number. Please wait an hour and try again.'
          : 'Too many code requests. Please wait 15 minutes and try again.';
      Alert.alert('Slow down', msg);
      setLoading(false);
      return;
    }

    // Send the OTP
    const { error } = await supabase.auth.updateUser({ phone });
    setLoading(false);

    if (error) {
      setPhoneError(error.message || 'Could not send code. Please try again.');
      return;
    }

    setStep('enter_code');
    setResendCooldown(60);
  };

  const verifyCode = async () => {
    const phone = '+1' + phoneDigits;
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      Alert.alert('Invalid code', 'The code must be 6 digits');
      return;
    }
    setLoading(true);
    const verifyOk = await checkOtpVerifyRateLimit();
    if (!verifyOk) {
      Alert.alert('Too many attempts', 'Please wait 15 minutes before trying again.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'phone_change' });
    if (error) {
      Alert.alert('Could not verify', error.message);
      setLoading(false);
      return;
    }
    await refreshProfile();
    setLoading(false);
  };

  const confirmCancel = async () => {
    setCancelLoading(true);
    const { data, error } = await supabase.rpc('cancel_unverified_signup');
    if (error) { Alert.alert('Error', error.message); setCancelLoading(false); return; }
    if (data?.error === 'already_verified') {
      Alert.alert('Cannot cancel', 'This account is already verified — you cannot cancel signup. Contact support if you want to delete your account.');
      setCancelLoading(false);
      return;
    }
    if (!data?.success) { Alert.alert('Error', 'Could not cancel signup. Please try again.'); setCancelLoading(false); return; }
    await supabase.auth.signOut();
  };

  const handleCancelSignup = () => Alert.alert(
    'Cancel signup?',
    'This will delete your account. You can sign up again later with the same email.',
    [
      { text: 'Keep account', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: confirmCancel },
    ]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>
            {step === 'enter_phone'
              ? "We'll send a 6-digit code by SMS"
              : `Enter the 6-digit code sent to ${formatPhoneDisplay(phoneDigits)}`}
          </Text>

          {step === 'enter_phone' ? (
            <>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="(555) 555-5555"
                placeholderTextColor="#9CA3AF"
                value={formatPhoneDisplay(phoneDigits)}
                onChangeText={(text) => { const digits = text.replace(/\D/g, ''); setPhoneDigits(digits); setPhoneError(''); }}
                autoCorrect={false}
              />
              {!!phoneError && (
                <Text style={styles.phoneErrorText}>{phoneError}</Text>
              )}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={sendCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                value={otp}
                onChangeText={setOtp}
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={verifyCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Verify</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={resendCooldown > 0 ? undefined : () => { setOtp(''); sendCode(); }}
                disabled={resendCooldown > 0}
              >
                <Text style={[styles.linkText, resendCooldown > 0 && styles.linkDisabled]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => { setStep('enter_phone'); setOtp(''); }}
              >
                <Text style={styles.linkText}>Change number</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSignup} disabled={cancelLoading}>
            {cancelLoading ? <ActivityIndicator size="small" color="#888" /> : <Text style={styles.cancelText}>Cancel signup and delete my account</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  linkDisabled: { color: '#9CA3AF' },
  cancelBtn: { alignItems: 'center', marginTop: 40 },
  cancelText: { fontSize: 14, color: '#888', textDecorationLine: 'underline' },
  phoneErrorText: { color: '#FF3B30', fontSize: 13, marginTop: -8, marginBottom: 8 },
});
