import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  galleryTitle: string;
  pendingCount: number;
  resuming: boolean;
  onResume: () => void;
  onCancel: () => void;
};

export default function ResumeUploadPrompt({
  visible,
  galleryTitle,
  pendingCount,
  resuming,
  onResume,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Upload unfinished</Text>
          <Text style={styles.body}>
            Not all photos finished uploading to{' '}
            <Text style={styles.galleryName}>"{galleryTitle}"</Text>. The ones that
            completed are already in your gallery.{' '}
            <Text style={styles.count}>{pendingCount} photo{pendingCount === 1 ? '' : 's'} remain.</Text>
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.primaryBtn, pressed && { opacity: 0.8 }, resuming && styles.btnDisabled]}
              onPress={onResume}
              disabled={resuming}
            >
              {resuming
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.primaryText}>Resume</Text>}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.cancelBtn, pressed && { opacity: 0.8 }, resuming && styles.btnDisabled]}
              onPress={onCancel}
              disabled={resuming}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 24 },
  galleryName: { fontWeight: '600', color: '#111827' },
  count: { fontWeight: '600', color: '#111827' },
  buttons: { gap: 10 },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { backgroundColor: '#FF6B6B' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  btnDisabled: { opacity: 0.5 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
