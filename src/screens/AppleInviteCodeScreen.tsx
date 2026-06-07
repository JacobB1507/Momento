import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AppleInviteCodeScreen() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const normalized = code.trim().toUpperCase();
      const { data: valid, error: validateError } = await supabase.rpc('validate_invite_code', { p_code: normalized });
      if (validateError || !valid) {
        setError('Invalid or already used invite code');
        return;
      }
      const { error: redeemError } = await supabase.rpc('redeem_invite_code', { p_code: normalized });
      if (redeemError) {
        setError('Could not redeem code. Please try again.');
        return;
      }
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await refreshProfile();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>You're almost in</Text>
        <Text style={styles.subtitle}>
          Momento is in private beta. Enter your invite code to continue.
        </Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={v => setCode(v.toUpperCase())}
          placeholder="Enter invite code"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
        />
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.88 },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>
        {error !== null && <Text style={styles.error}>{error}</Text>}
        <Pressable
          onPress={handleSignOut}
          disabled={loading}
          style={[styles.signOut, loading && { opacity: 0.4 }]}
        >
          <Text style={styles.signOutText}>Wrong account? Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#111827',
    letterSpacing: 2,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  error: {
    color: '#FF3B30',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  signOut: { marginTop: 32 },
  signOutText: { color: '#888888', fontSize: 15, fontWeight: '500' },
});
