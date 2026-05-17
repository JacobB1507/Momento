import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos } from '../lib/galleries';
import type { GalleryPrivacy, Photo } from '../types/database';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const GRID_GAP = 8;
const NUM_COLS = 3;
const GRID_ITEM_WIDTH = (WINDOW_WIDTH * 0.88 - 48 - GRID_GAP * (NUM_COLS - 1)) / NUM_COLS;

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
  onTransferOwnership?: () => void;
  onCoverPhotoUpdated?: () => void;
};

export function SettingsModal({
  visible,
  galleryId,
  currentPrivacy,
  onClose,
  onPrivacySaved,
  onGalleryDeleted,
  onTransferOwnership,
  onCoverPhotoUpdated,
}: Props) {
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>(currentPrivacy);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'main' | 'cover-picker'>('main');
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverState, setCoverState] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) { setDraftPrivacy(currentPrivacy); setMode('main'); }
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
    Alert.alert('Delete gallery?', 'All photos and members will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        onClose();
        const { error } = await supabase.from('galleries').delete().eq('id', galleryId);
        if (error) { Alert.alert('Error', error.message); return; }
        onGalleryDeleted();
      }},
    ]);
  };

  const openCoverPicker = async () => {
    setMode('cover-picker');
    setCoverState('loading');
    fetchGalleryPhotos(galleryId).then(p => setCoverPhotos(p)).finally(() => setCoverState('idle'));
  };

  const handleCoverPhotoSelect = async (photoId: string) => {
    setSelectedPhotoId(photoId);
    setCoverState('saving');
    try {
      const { data: photo, error: fetchError } = await supabase
        .from('gallery_photos')
        .select('url, gallery_id')
        .eq('id', photoId)
        .single();
      if (fetchError || !photo || photo.gallery_id !== galleryId) {
        Alert.alert('Error', 'Could not update cover photo.');
        return;
      }
      const { error } = await supabase
        .from('galleries')
        .update({ cover_photo_url: photo.url })
        .eq('id', galleryId);
      if (error) { Alert.alert('Error', 'Could not update cover photo.'); return; }
      setMode('main');
      onCoverPhotoUpdated?.();
    } finally {
      setCoverState('idle');
      setSelectedPhotoId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, mode === 'cover-picker' && styles.cardPicker]} onPress={() => {}}>

          {mode === 'cover-picker' ? (
            <>
              <View style={styles.pickerHeader}>
                <Pressable onPress={() => setMode('main')} hitSlop={12}>
                  <Text style={styles.pickerBack}>← Back</Text>
                </Pressable>
                <Text style={styles.pickerTitle}>Choose Cover Photo</Text>
              </View>
              {coverState === 'loading' ? (
                <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 32 }} />
              ) : (
                <FlatList
                  data={coverPhotos}
                  keyExtractor={p => p.id}
                  numColumns={3}
                  contentContainerStyle={styles.gridContent}
                  columnWrapperStyle={styles.gridRow}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => coverState === 'idle' && handleCoverPhotoSelect(item.id)}
                      style={styles.coverThumb}
                    >
                      <Image source={{ uri: item.url }} style={styles.coverThumbImg} resizeMode="cover" />
                      {selectedPhotoId === item.id && (
                        <View style={styles.selectedOverlay}>
                          <Ionicons name="checkmark-circle" size={28} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  )}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.title}>Gallery Settings</Text>

              <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]} onPress={openCoverPicker}>
                <View style={styles.actionRowLeft}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="image-outline" size={18} color="#374151" />
                  </View>
                  <Text style={styles.actionRowText}>Change Cover Photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

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
              {onTransferOwnership && (
                <Pressable style={({ pressed }) => [styles.transferBtn, pressed && { opacity: 0.7 }]} onPress={onTransferOwnership}>
                  <Text style={styles.transferText}>Transfer Ownership</Text>
                </Pressable>
              )}
              <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]} onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete Gallery</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardPicker: { maxHeight: WINDOW_HEIGHT * 0.7 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  section: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.2, marginBottom: 10, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 12,
  },
  actionRowPressed: { backgroundColor: '#F9FAFB' },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  privacyRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  privacyOption: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
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
  transferBtn: { marginTop: 16, alignItems: 'center' },
  transferText: { fontSize: 13, fontWeight: '500', color: '#FF6B6B' },
  deleteBtn: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#efefef', paddingTop: 16, alignItems: 'center' },
  deleteText: { fontSize: 13, fontWeight: '400', color: '#999' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  pickerBack: { fontSize: 14, color: '#FF6B6B', fontWeight: '600', marginRight: 12 },
  pickerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  gridContent: { paddingBottom: 16 },
  gridRow: { gap: GRID_GAP },
  coverThumb: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH, borderRadius: 6, overflow: 'hidden', marginBottom: GRID_GAP },
  coverThumbImg: { width: '100%', height: '100%' },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
