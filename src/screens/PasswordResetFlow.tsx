import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { supabase } from '../lib/supabase';
import sharedStyles from '../styles/forgotPasswordStyles';

export interface PasswordResetFlowProps {
  mode: 'change' | 'forgot';
  initialEmail?: string;
  onDone: () => void;
  onCancel?: () => void;
}

type Step = 'confirm_email' | 'enter_code';

export default function PasswordResetFlow({
  mode,
  initialEmail = '',
  onDone,
  onCancel,
}: PasswordResetFlowProps) {
  const [step, setStep] = useState<Step>('confirm_email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    setResendSeconds(60);
    intervalRef.current = setInterval(() => {
      setResendSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const normalizedEmail = email.trim().toLowerCase();

  // ── Step 1 ──────────────────────────────────────────────────────────────
  const sendOtp = async () => {
    setEmailError('');
    if (!normalizedEmail) {
      setEmailError('Please enter your email.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    setLoading(false);
    if (error) {
      setEmailError(error.message ?? 'Could not send code. Please try again.');
      return;
    }
    setStep('enter_code');
    startCooldown();
  };

  // ── Step 2 ──────────────────────────────────────────────────────────────
  const verifyOtp = async () => {
    setCodeError('');
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'recovery',
    });
    setLoading(false);
    if (error || !data.session) {
      setCodeError('Wrong code, try again.');
      setCode('');
      return;
    }
    // Recovery session is now active — RootNavigator will present ResetPasswordScreen.
  };

  const resendOtp = async () => {
    setCodeError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    setLoading(false);
    if (error) {
      setCodeError(error.message ?? 'Could not resend code. Please try again.');
      return;
    }
    startCooldown();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={local.flex}
      >
        <ScrollView
          contentContainerStyle={local.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Confirm email ─────────────────────────────────────── */}
          {step === 'confirm_email' && (
            <>
              <Text style={sharedStyles.heading}>Confirm your email</Text>
              <Text style={sharedStyles.sub}>We'll send a 6-digit code to reset your password.</Text>

              <Text style={sharedStyles.label}>Email</Text>
              <TextInput
                style={[
                  sharedStyles.input,
                  !!emailError && sharedStyles.inputError,
                ]}
                value={email}
                onChangeText={v => { setEmail(v); setEmailError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={sendOtp}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
              />
              {!!emailError && <Text style={sharedStyles.errorText}>{emailError}</Text>}

              <Pressable
                style={[sharedStyles.button, loading && sharedStyles.buttonDisabled]}
                onPress={sendOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={sharedStyles.buttonText}>Send reset email</Text>}
              </Pressable>
            </>
          )}

          {/* ── Step 2: Enter code ────────────────────────────────────────── */}
          {step === 'enter_code' && (
            <>
              <Text style={sharedStyles.heading}>Enter the 6-digit code</Text>
              <Text style={sharedStyles.sub}>
                A code was sent to{' '}
                <Text style={local.emailHighlight}>{normalizedEmail}</Text>.
              </Text>

              <Text style={sharedStyles.label}>Code</Text>
              <TextInput
                style={[sharedStyles.input, !!codeError && sharedStyles.inputError]}
                value={code}
                onChangeText={v => { setCode(v.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                returnKeyType="done"
                onSubmitEditing={code.length === 6 ? verifyOtp : undefined}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
              />
              {!!codeError && <Text style={sharedStyles.errorText}>{codeError}</Text>}

              <Pressable
                style={[
                  sharedStyles.button,
                  (loading || code.length !== 6) && sharedStyles.buttonDisabled,
                ]}
                onPress={verifyOtp}
                disabled={loading || code.length !== 6}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={sharedStyles.buttonText}>Verify code</Text>}
              </Pressable>

              <Pressable
                style={[
                  local.secondaryBtn,
                  (resendSeconds > 0 || loading) && local.secondaryBtnDisabled,
                ]}
                onPress={resendSeconds > 0 || loading ? undefined : resendOtp}
                disabled={resendSeconds > 0 || loading}
              >
                <Text style={[
                  local.secondaryText,
                  (resendSeconds > 0 || loading) && local.secondaryTextDisabled,
                ]}>
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                </Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const local = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  secondaryBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  secondaryBtnDisabled: {
    opacity: 0.55,
  },
  secondaryText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  secondaryTextDisabled: {
    color: '#9CA3AF',
  },
  emailHighlight: {
    color: '#374151',
    fontWeight: '600',
  },
});
