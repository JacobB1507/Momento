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
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { checkRateLimit } from '../../lib/rateLimit';
import { reportError } from '../../lib/errorReport';
import type { LoginNavigationProp, RootStackParamList } from '../../navigation/types';
import PasswordInput from '../../components/PasswordInput';
import { parseAuthIdentifier } from '../../lib/authIdentifier';
import { formatPhone, looksLikePhone, stripPhone } from '../../lib/phoneFormat';

type Props = { navigation: LoginNavigationProp };

export default function LoginScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'Login'>>();
  const [identifier, setIdentifier] = useState((() => {
    const params = (route.params as any) ?? {};
    const phone = params.prefilledPhone;
    if (phone) return formatPhone(phone);
    const email = params.email;
    if (email) return email;
    return '';
  })());
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState(false);

  const clearErrors = () => { setIdentifierError(''); setPasswordError(''); setAuthError(false); };

  const handleLogin = async () => {
    const allowed = await checkRateLimit('login_attempt');
    if (!allowed) {
      Alert.alert('Too many attempts', 'Please wait 15 minutes before trying again.');
      return;
    }
    clearErrors();
    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }
    const parsed = parseAuthIdentifier(identifier);
    if (parsed.type === 'invalid') {
      setIdentifierError(parsed.reason);
      return;
    }
    setLoading(true);
    const credentials = parsed.type === 'email'
      ? { email: parsed.email, password }
      : { phone: parsed.phone, password };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    setLoading(false);
    if (error) {
      setAuthError(true);
      reportError('LoginScreen.signIn', error);
    }
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
            <Text style={styles.tagline}>Your memories, beautifully shared</Text>
            <View style={styles.privateBetaPill}>
              <Text style={styles.privateBetaText}>PRIVATE BETA</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email or phone</Text>
              {!!identifierError && <Text style={styles.fieldError}>{identifierError}</Text>}
              <TextInput
                style={styles.input}
                placeholder="Email or phone"
                placeholderTextColor="#9CA3AF"
                value={identifier}
                onChangeText={v => {
                  if (looksLikePhone(v)) {
                    setIdentifier(formatPhone(stripPhone(v)));
                  } else {
                    setIdentifier(v);
                  }
                  clearErrors();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={looksLikePhone(identifier) ? 'phone-pad' : 'email-address'}
                autoComplete={looksLikePhone(identifier) ? 'tel' : 'email'}
                textContentType={looksLikePhone(identifier) ? 'telephoneNumber' : 'emailAddress'}
                maxLength={looksLikePhone(identifier) ? 14 : 254}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
              <PasswordInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={v => { setPassword(v); clearErrors(); }}
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </Pressable>

            {authError && (
              <View style={styles.authErrorBlock}>
                <Text style={styles.fieldError}>Incorrect email or password.</Text>
                <View style={styles.authErrorRow}>
                  <Text style={styles.switchText}>New to Momento? </Text>
                  <Pressable onPress={() => navigation.navigate('SignUp')}>
                    <Text style={styles.link}>Sign up</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <Pressable onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.link}>Sign Up</Text>
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
  fieldError: { color: '#FF3B30', fontSize: 13, marginBottom: 6 },
  authErrorBlock: { marginTop: 14, alignItems: 'center' },
  authErrorRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },

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
});
