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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { SignUpNavigationProp } from '../../navigation/types';

type Props = { navigation: SignUpNavigationProp };

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSignUp = async () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error: probeError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: 'probe' });
    if (
      probeError?.message?.toLowerCase().includes('invalid login credentials') ||
      probeError?.message?.toLowerCase().includes('invalid credentials')
    ) {
      // Account doesn't exist — proceed with sign up
    } else if (!probeError) {
      setLoading(false);
      return;
    } else {
      setLoading(false);
      setEmailError('An account with this email already exists.');
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error?.message?.toLowerCase().includes('already registered')) {
      setEmailError('An account with this email already exists.');
    } else if (error?.message?.toLowerCase().includes('password')) {
      setPasswordError('Password must be at least 6 characters.');
    } else if (error) {
      setGeneralError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create account</Text>

            {sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Account created! Check your email for a verification link.</Text>
              </View>
            ) : (
              <>
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
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={v => { setPassword(v); setPasswordError(''); }}
                    secureTextEntry
                    autoComplete="off"
                    textContentType="oneTimeCode"
                    passwordRules=""
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                  />
                </View>

                {!!generalError && <Text style={styles.generalError}>{generalError}</Text>}
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </Pressable>
              </>
            )}

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
  generalError: { color: '#FF3B30', fontSize: 13, marginBottom: 12, textAlign: 'center' },

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
});
