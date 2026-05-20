import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { guardOtpSend, checkOtpVerifyRateLimit } from '../lib/rateLimit';

export default function ChangePhoneScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'reauth' | 'enter_new_phone' | 'enter_code'>('reauth');
  const [password, setPassword] = useState('');
  const [newPhone, setNewPhone] = useState('+1');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleReauth = async () => {
    if (!password) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      Alert.alert('Cannot reauth', 'No email on account — contact support');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) {
      Alert.alert('Incorrect password', error.message);
      setLoading(false);
      return;
    }
    setStep('enter_new_phone');
    setLoading(false);
  };

  const handleSendNewCode = async () => {
    if (!newPhone.startsWith('+') || newPhone.replace(/\D/g, '').length < 8) {
      Alert.alert('Invalid number', 'Use international format like +15551234567');
      return;
    }
    setLoading(true);
    const { data: exists, error: checkError } = await supabase.rpc('check_phone_exists', { phone_to_check: newPhone });
    if (checkError) {
      Alert.alert('Could not check phone', checkError.message);
      setLoading(false);
      return;
    }
    if (exists === true) {
      Alert.alert('Number in use', 'This phone number is already on another account.');
      setLoading(false);
      return;
    }
    const guard = await guardOtpSend(newPhone);
    if (!guard.ok) {
      const msg =
        guard.reason === 'phone_hourly'
          ? 'Too many code requests for this number. Please wait an hour and try again.'
          : 'Too many code requests. Please wait 15 minutes and try again.';
      Alert.alert('Slow down', msg);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ phone: newPhone });
    if (error) {
      Alert.alert('Could not send code', error.message);
      setLoading(false);
      return;
    }
    setStep('enter_code');
    setResendCooldown(60);
    setLoading(false);
  };

  const handleVerifyNewPhone = async () => {
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      Alert.alert('Invalid code', 'Must be 6 digits');
      return;
    }
    setLoading(true);
    const verifyOk = await checkOtpVerifyRateLimit();
    if (!verifyOk) {
      Alert.alert('Too many attempts', 'Please wait 15 minutes before trying again.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.verifyOtp({ phone: newPhone, token: otp, type: 'phone_change' });
    if (error) {
      Alert.alert('Could not verify', error.message);
      setLoading(false);
      return;
    }
    Alert.alert('Phone updated', 'Use your new number to log in next time.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await handleSendNewCode();
  };

  const subtitles: Record<typeof step, string> = {
    reauth: 'Enter your current password to continue',
    enter_new_phone: 'Enter your new phone number',
    enter_code: `Enter the 6-digit code sent to ${newPhone}`,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Phone Number</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>{subtitles[step]}</Text>

          {step === 'reauth' && (
            <View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Current password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleReauth} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'enter_new_phone' && (
            <View>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="+15551234567"
                placeholderTextColor="#999"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendNewCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Code</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'enter_code' && (
            <View>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyNewPhone} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={handleResend} disabled={resendCooldown > 0}>
                <Text style={[styles.linkText, resendCooldown > 0 && styles.linkMuted]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => setStep('enter_new_phone')}>
                <Text style={styles.linkText}>Change number</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { marginRight: 12 },
  backBtnText: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#000', marginBottom: 14 },
  btn: { backgroundColor: '#FF6B6B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginBottom: 12 },
  linkText: { color: '#666', fontSize: 14, textDecorationLine: 'underline' },
  linkMuted: { color: '#aaa', textDecorationLine: 'none' },
});
