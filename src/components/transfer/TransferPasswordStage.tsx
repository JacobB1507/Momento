import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import PasswordInput from '../PasswordInput';

type Props = {
  galleryTitle: string;
  password: string;
  onPasswordChange: (v: string) => void;
  passwordError: string | null;
  verifying: boolean;
  onContinue: () => void;
};

export function TransferPasswordStage({
  galleryTitle,
  password,
  onPasswordChange,
  passwordError,
  verifying,
  onContinue,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Transfer Ownership</Text>
      <Text style={styles.body}>
        You're transferring ownership of{' '}
        <Text style={styles.galleryName}>"{galleryTitle}"</Text>
        {". This is permanent — you'll become an admin and the new owner will have full control."}
      </Text>
      <View style={styles.inputWrapper}>
        <PasswordInput
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Enter your password to continue"
          style={{ fontSize: 15, minHeight: 42 }}
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
      </View>
      <Pressable
        style={({ pressed }) => [styles.btn, (verifying || !password) && styles.btnDisabled, pressed && { opacity: 0.85 }]}
        onPress={onContinue}
        disabled={verifying || !password}
      >
        {verifying
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Continue</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 28 },
  galleryName: { fontWeight: '600', color: '#374151' },
  inputWrapper: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 12,
    marginBottom: 24,
  },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 6 },
  btn: {
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
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
