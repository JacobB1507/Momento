import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, checkPhoneRateLimit, RATE_LIMITS } from '../../lib/rateLimit';
import { validatePassword, validateEmailFormat, PASSWORD_RULE } from '../../lib/validation';
import { userFacingError, reportError } from '../../lib/errorReport';
import type { SignUpNavigationProp } from '../../navigation/types';
import PasswordInput from '../../components/PasswordInput';
import { setPendingPhone } from '../../lib/pendingPhone';
import { formatPhone } from '../../lib/phoneFormat';

type Props = { navigation: SignUpNavigationProp };

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [accountExistsForEmail, setAccountExistsForEmail] = useState<string | null>(null);
  const [accountExistsForPhone, setAccountExistsForPhone] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!inviteCode.trim()) {
      setInviteCodeError('Invite code is required');
      return;
    }

    const { data: codeValid, error: codeError } = await supabase.rpc(
      'validate_invite_code',
      { p_code: inviteCode.trim() }
    );

    if (codeError) {
      setInviteCodeError('Could not validate code. Please try again.');
      reportError('SignUpScreen.validateInviteCode', codeError);
      return;
    }

    if (!codeValid) {
      setInviteCodeError('Invalid or already-used invite code');
      return;
    }

    const allowed = await checkRateLimit('signup_attempt');
    if (!allowed) {
      Alert.alert('Slow down', 'Please wait a few minutes before trying again.');
      return;
    }
    setEmailError('');
    setPasswordError(null);
    setPolicyError('');
    setPhoneError(null);
    if (!acceptedPolicy) {
      setPolicyError('Please accept the Privacy Policy to continue.');
      return;
    }
    if (!email.trim()) { setEmailError('Please enter your email.'); return; }
    if (!password) { setPasswordError('Please enter your password.'); return; }
    if (!confirmPassword) { setPasswordError('Please confirm your password.'); return; }
    const emailErr = validateEmailFormat(email);
    if (emailErr) { setEmailError(emailErr); return; }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setPasswordError(pwErr);
      return;
    }
    const digits = phoneDigits;
    if (digits.length !== 10) {
      setPhoneError('Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setAccountExistsForEmail(null);
    setAccountExistsForPhone(null);
    const normalizedPhone = '+1' + digits;
    const phoneResult = await supabase.rpc('check_phone_exists', { phone_to_check: normalizedPhone });

    if (phoneResult?.error) {
      setPhoneError('Could not verify phone number. Please try again.');
      setLoading(false);
      return;
    }

    if (phoneResult?.data === true) {
      setAccountExistsForPhone(digits);
      setLoading(false);
      return;
    }

    // Per-phone-number rate limit guard. Protects against an attacker creating
    // many accounts targeting the same victim phone number for SMS abuse.
    const phoneAllowed = await checkPhoneRateLimit(
      normalizedPhone,
      'otp_send_hourly',
      RATE_LIMITS.otp_send_hourly.maxAttempts,
      RATE_LIMITS.otp_send_hourly.windowMinutes
    );
    if (!phoneAllowed) {
      Alert.alert('Slow down', 'Too many signups for this phone number. Please wait an hour.');
      setLoading(false);
      return;
    }

    const signUpResult = await supabase.auth.signUp({ email: email.trim(), password });
    const signUpError = signUpResult.error;
    const signUpData = signUpResult.data;

    if (signUpError) {
      const errorMessage = signUpError.message?.toLowerCase() ?? '';
      const isExistingAccount =
        errorMessage.includes('already registered') ||
        errorMessage.includes('already been registered') ||
        errorMessage.includes('user already exists') ||
        errorMessage.includes('email address already') ||
        errorMessage.includes('already in use');
      if (isExistingAccount) {
        setAccountExistsForEmail(email.trim());
      } else {
        setEmailError(userFacingError(signUpError));
        reportError('SignUpScreen.signUp', signUpError);
      }
      setLoading(false);
      return;
    }

    const identities = signUpData?.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      setAccountExistsForEmail(email.trim());
      setLoading(false);
      return;
    }

    const { data: redeemed, error: redeemError } = await supabase.rpc(
      'redeem_invite_code',
      { p_code: inviteCode.trim() }
    );
    if (redeemError || !redeemed) {
      reportError('SignUpScreen.redeemInviteCode', redeemError ?? new Error('Redeem returned false'));
    }
    setPendingPhone(phoneDigits);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.logo}>📸</Text>
            <Text style={styles.appName}>Momento</Text>
            <Text style={styles.tagline}>Start sharing your world</Text>
            <View style={styles.privateBetaPill}>
              <Text style={styles.privateBetaText}>PRIVATE BETA</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create account</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Invite Code</Text>
              <TextInput
                style={styles.input}
                placeholder="MOMENTO-XXXXXXX"
                placeholderTextColor="#9CA3AF"
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text.toUpperCase());
                  if (inviteCodeError) setInviteCodeError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={32}
                returnKeyType="next"
              />
            </View>

            {inviteCodeError && (
              <View style={styles.existingAccountBanner}>
                <Text style={styles.existingAccountText}>{inviteCodeError}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              {phoneError && (
                <Text style={styles.errorText}>{phoneError}</Text>
              )}
              <View style={styles.phoneRow}>
                <Text style={styles.phonePfx}>+1</Text>
                <TextInput
                  style={[styles.input, styles.phoneInputInner]}
                  placeholder="(555) 555-5555"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={14}
                  value={formatPhone(phoneDigits)}
                  onChangeText={v => { setPhoneDigits(v.replace(/\D/g, '')); setPhoneError(null); if (accountExistsForPhone !== null) setAccountExistsForPhone(null); }}
                />
              </View>
            </View>

            {accountExistsForPhone && (
              <View style={styles.existingAccountBanner}>
                <Text style={styles.existingAccountText}>
                  An account with this phone number already exists.{' '}
                  <Text
                    style={styles.existingAccountLink}
                    onPress={() => {
                      (navigation as any).navigate('Login', { prefilledPhone: accountExistsForPhone });
                    }}
                  >
                    Log in
                  </Text>
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={v => { setEmail(v); setEmailError(''); if (accountExistsForEmail !== null) setAccountExistsForEmail(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            {accountExistsForEmail && (
              <View style={styles.existingAccountBanner}>
                <Text style={styles.existingAccountText}>
                  An account with this email already exists.{' '}
                  <Text
                    style={styles.existingAccountLink}
                    onPress={() => {
                      (navigation as any).navigate('Login', { prefilledEmail: accountExistsForEmail });
                    }}
                  >
                    Log in
                  </Text>
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <PasswordInput
                style={[styles.input, passwordError && { borderColor: '#FF3B30', borderWidth: 1 }]}
                placeholder="8+ characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={v => { setPassword(v); setPasswordError(null); }}
                onBlur={() => { if (password.length > 0) setPasswordError(validatePassword(password)); }}
                autoComplete="off"
                textContentType="oneTimeCode"
                passwordRules=""
                returnKeyType="next"
              />
              {passwordError && (
                <Text style={{ color: '#FF3B30', fontSize: 13, marginTop: 6, marginLeft: 4 }}>
                  {passwordError}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <PasswordInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); setPasswordError(null); }}
                onBlur={() => {
                  if (confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword) {
                    setPasswordError('Passwords do not match.');
                  }
                }}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
            </View>

            <View style={styles.policyRow}>
              <TouchableOpacity
                style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
                onPress={() => { setAcceptedPolicy(v => !v); setPolicyError(''); }}
                activeOpacity={0.7}
              >
                {acceptedPolicy && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.policyText}>
                I agree to the{' '}
                <Text style={styles.policyLink} onPress={() => navigation.navigate('TermsOfService')}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.policyLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
            {!!policyError && <Text style={styles.fieldError}>{policyError}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading || !acceptedPolicy) && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
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
  backButton: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  scroll: { flexGrow: 1 },

  hero: {
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logo: { fontSize: 48, marginBottom: 12 },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '400',
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 28,
  },

  field: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },

  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: { color: '#6B7280', fontSize: 15 },
  link: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  fieldError: { color: '#FF3B30', fontSize: 13, marginBottom: 8 },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
  },
  generalError: { color: '#FF3B30', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#555',
    borderRadius: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#E91E8C',
    borderColor: '#E91E8C',
  },
  policyText: {
    color: '#6B7280',
    fontSize: 14,
    flex: 1,
  },
  policyLink: {
    color: '#E91E8C',
    fontWeight: '600',
  },

  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  existingAccountBanner: {
    marginTop: -12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  existingAccountText: {
    fontSize: 14,
    color: '#D32F2F',
    lineHeight: 20,
  },
  existingAccountLink: {
    color: '#FF6B6B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  privateBetaPill: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  privateBetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  phonePfx: { paddingLeft: 16, fontSize: 16, color: '#6B7280' },
  phoneInputInner: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingLeft: 4 },
});
