import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TransferMember } from './TransferSelectStage';

type Props = {
  selectedNewOwner: TransferMember;
  transferring: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TransferConfirmStage({ selectedNewOwner, transferring, onConfirm, onCancel }: Props) {
  const name = selectedNewOwner.display_name || selectedNewOwner.username || 'this person';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Transfer ownership to {name}?</Text>
      <Text style={styles.body}>
        They'll become the new owner and you'll be demoted to admin. This can be reversed only if they choose to transfer it back.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.confirmBtn, transferring && styles.btnDisabled, pressed && { opacity: 0.85 }]}
        onPress={onConfirm}
        disabled={transferring}
      >
        {transferring
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.confirmBtnText}>Transfer ownership</Text>}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        onPress={onCancel}
        disabled={transferring}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 32 },
  confirmBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.55 },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: { color: '#374151', fontSize: 17, fontWeight: '600' },
});
