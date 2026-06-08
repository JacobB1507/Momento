import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { validatePassword, PASSWORD_RULE } from '../lib/validation';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordScreen() {
  const { session, clearPasswordRecovery } = useAuth();
  const hadSessionRef = useRef(session !== null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    if (hadSessionRef.current) {
      clearPasswordRecovery();
    } else {
      supabase.auth.signOut();
    }
  };

  const confirmNewPassword = async () => {
    setPasswordError('');
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setPasswordError(pwErr); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setPasswordError(error.message ?? 'Could not update password. Please try again.');
      return;
    }
    Alert.alert('Password updated', 'Your password has been successfully changed.', [
      { text: 'OK', onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.cancelRow}>
            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.sub}>{PASSWORD_RULE}</Text>

            <Text style={styles.fieldLabel}>New password</Text>
            <PasswordInput
              containerStyle={styles.passwordContainer}
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={v => { setNewPassword(v); setPasswordError(''); }}
              autoComplete="off"
              textContentType="oneTimeCode"
              passwordRules=""
              returnKeyType="next"
              placeholder="8+ characters"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <PasswordInput
              containerStyle={styles.passwordContainer}
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); setPasswordError(''); }}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={confirmNewPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
            />

            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={confirmNewPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Confirm new password</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  cancelRow: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  cancelBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  cancelText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },

  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  heading: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 22 },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },

  errorText: { fontSize: 13, color: '#ef4444', marginTop: -18, marginBottom: 16 },

  passwordContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 24,
  },
  passwordInput: {
    paddingLeft: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },

  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
