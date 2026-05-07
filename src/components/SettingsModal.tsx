import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import type { GalleryPrivacy } from '../types/database';

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

type Props = {
  visible: boolean;
  galleryId: string;
  currentPrivacy: GalleryPrivacy;
  onClose: () => void;
  onPrivacySaved: (privacy: GalleryPrivacy) => void;
  onGalleryDeleted: () => void;
};

export function SettingsModal({
  visible,
  galleryId,
  currentPrivacy,
  onClose,
  onPrivacySaved,
  onGalleryDeleted,
}: Props) {
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>(currentPrivacy);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDraftPrivacy(currentPrivacy);
  }, [visible, currentPrivacy]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('galleries').update({ privacy: draftPrivacy }).eq('id', galleryId);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onPrivacySaved(draftPrivacy);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete gallery?',
      'All photos and members will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            onClose();
            const { error } = await supabase.from('galleries').delete().eq('id', galleryId);
            if (error) { Alert.alert('Error', error.message); return; }
            onGalleryDeleted();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Gallery Settings</Text>
          <Text style={styles.section}>Privacy</Text>
          <View style={styles.privacyRow}>
            {PRIVACY_OPTIONS.map(opt => {
              const selected = draftPrivacy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [styles.privacyOption, selected && styles.privacyOptionSelected, pressed && !selected && { opacity: 0.7 }]}
                  onPress={() => setDraftPrivacy(opt.value)}
                >
                  <Text style={[styles.privacyLabel, selected && styles.privacyLabelSelected]}>{opt.label}</Text>
                  <Text style={[styles.privacyDesc, selected && styles.privacyDescSelected]}>{opt.description}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.save, saving && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </Pressable>
            <Pressable style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]} onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete Gallery</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  section: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.2, marginBottom: 10 },
  privacyRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  privacyOption: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  privacyOptionSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' },
  privacyLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 2 },
  privacyLabelSelected: { color: '#FF6B6B' },
  privacyDesc: { fontSize: 10, color: '#9CA3AF' },
  privacyDescSelected: { color: '#FF6B6B' },
  buttons: { flexDirection: 'column' },
  save: { height: 52, borderRadius: 14, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { height: 52, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cancelText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  deleteBtn: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#efefef', paddingTop: 16, alignItems: 'center' },
  deleteText: { fontSize: 13, fontWeight: '400', color: '#999' },
});
