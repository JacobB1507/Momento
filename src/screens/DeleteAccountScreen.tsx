import React, { useState } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'DeleteAccount'> };

export default function DeleteAccountScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setError('');
    if (!password) { setError('Please enter your password.'); return; }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('Could not determine your account email.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (authError) {
      setError('Incorrect password.');
      setLoading(false);
      return;
    }

    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account', { uid: user.id });
      if (rpcError) throw rpcError;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete account. Please try again.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Delete Account</Text>
          <Text style={styles.subtitle}>
            Enter your password to permanently delete your account and all associated data. This cannot be undone.
          </Text>
        </View>

        <View style={styles.body}>
          <TextInput
            style={[styles.input, !!error && styles.inputError]}
            placeholder="Enter your password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={v => { setPassword(v); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleDelete}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
              loading && styles.deleteButtonDisabled,
            ]}
            onPress={handleDelete}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  flex: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 20 },
  backText: { fontSize: 17, color: '#FF6B6B', fontWeight: '500' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 22,
  },

  body: { paddingHorizontal: 20 },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#374151',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 8 },

  footer: { paddingHorizontal: 20, marginTop: 24 },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  deleteButtonPressed: { opacity: 0.88 },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
