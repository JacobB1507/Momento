import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PasswordInput from '../components/PasswordInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/validation';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setPasswordError(pwErr);
      return;
    }

    const email = session?.user.email;
    if (!email) {
      Alert.alert('Error', 'Could not determine your email address.');
      return;
    }

    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setSending(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Email sent',
      'Password reset email sent! Check your inbox for a link to set your new password.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>New Password</Text>
          <PasswordInput
            style={[styles.input, passwordError ? { borderColor: '#FF3B30', borderWidth: 1 } : null]}
            value={newPassword}
            onChangeText={v => { setNewPassword(v); setPasswordError(null); }}
            onBlur={() => setPasswordError(validatePassword(newPassword))}
            placeholder="At least 8 characters"
            placeholderTextColor="#9CA3AF"
            returnKeyType="next"
          />
          {passwordError && (
            <Text style={styles.fieldError}>{passwordError}</Text>
          )}
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.label}>Confirm Password</Text>
          <PasswordInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            onSubmitEditing={handleSend}
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && { opacity: 0.75 },
              sending && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send Reset Email</Text>
            )}
          </Pressable>
          <Text style={styles.note}>
            A secure link will be sent to your current email address.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  cancelButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  cancelText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  section: { paddingHorizontal: 16 },
  sectionSpaced: { marginTop: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldError: { color: '#FF3B30', fontSize: 13, marginTop: 6, marginLeft: 4 },

  footer: { paddingHorizontal: 16, marginTop: 24 },
  sendButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { marginTop: 12, fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
