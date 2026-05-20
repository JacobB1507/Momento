import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { getDedupePreference, setDedupePreference } from '../lib/photoSave';

type Props = {
  visible: boolean;
  selectedCount: number;
  userId: string;
  onCancel: () => void;
  onConfirm: (dedupe: boolean) => void;
};

export default function SaveConfirmSheet({ visible, selectedCount, userId, onCancel, onConfirm }: Props) {
  const [dedupe, setDedupe] = useState(true);

  useEffect(() => {
    if (visible) {
      getDedupePreference(userId).then(setDedupe).catch(() => setDedupe(true));
    }
  }, [visible, userId]);

  const handleSave = async () => {
    await setDedupePreference(userId, dedupe);
    onConfirm(dedupe);
  };

  const photoLabel = `${selectedCount} photo${selectedCount === 1 ? '' : 's'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View>
          <Pressable onPress={() => {}} style={styles.card}>
            <Text style={styles.title}>Save {photoLabel}?</Text>
            <Text style={styles.subtitle}>Photos will be saved to your camera roll.</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabels}>
                <Text style={styles.toggleTitle}>Don't save duplicates</Text>
                <Text style={styles.toggleSub}>
                  Skip photos you've already saved from this gallery.
                </Text>
              </View>
              <Switch
                value={dedupe}
                onValueChange={setDedupe}
                trackColor={{ false: '#E5E5EA', true: '#FF3B30' }}
              />
            </View>
            <View style={styles.btnRow}>
              <Pressable style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveLabel}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 20 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E5EA',
    paddingVertical: 12,
  },
  toggleLabels: { flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, height: 44, borderWidth: 1, borderColor: '#E5E5EA',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  cancelLabel: { fontSize: 16, fontWeight: '500', color: '#1C1C1E' },
  saveBtn: {
    flex: 1, height: 44, backgroundColor: '#FF3B30',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  saveLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
