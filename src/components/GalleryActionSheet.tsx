import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchGalleryPhotos } from '../lib/galleries';
import type { Gallery, GalleryPrivacy, Photo } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_CELL = Math.floor((SCREEN_WIDTH - 48 - 4) / 3);

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

type Mode = 'actions' | 'rename' | 'privacy' | 'cover';

type Props = {
  gallery: Gallery | null;
  onClose: () => void;
  onSaveRename: (title: string) => Promise<void>;
  onSavePrivacy: (privacy: GalleryPrivacy) => Promise<void>;
  onSelectCover: (photoUrl: string) => Promise<void>;
  onDelete: () => void;
};

export function GalleryActionSheet({
  gallery,
  onClose,
  onSaveRename,
  onSavePrivacy,
  onSelectCover,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<Mode>('actions');
  const [renameText, setRenameText] = useState('');
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>('friends');
  const [saving, setSaving] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverPhotosLoading, setCoverPhotosLoading] = useState(false);

  useEffect(() => {
    if (gallery) {
      setMode('actions');
      setRenameText(gallery.title);
      setDraftPrivacy(gallery.privacy);
    }
  }, [gallery?.id]);

  const handleSaveRename = async () => {
    const trimmed = renameText.trim();
    if (!trimmed) return;
    setSaving(true);
    await onSaveRename(trimmed);
    setSaving(false);
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    await onSavePrivacy(draftPrivacy);
    setSaving(false);
  };

  const handleChangeCover = async () => {
    if (!gallery) return;
    setMode('cover');
    setCoverPhotosLoading(true);
    try {
      setCoverPhotos(await fetchGalleryPhotos(gallery.id));
    } catch {
      setCoverPhotos([]);
    } finally {
      setCoverPhotosLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete gallery?',
      'All photos and members will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Modal visible={gallery !== null} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.dismiss} onPress={onClose} />

        {mode === 'actions' && (
          <View style={styles.card}>
            <View style={styles.handle} />
            <Text style={styles.title} numberOfLines={1}>{gallery?.title}</Text>
            {([
              { label: 'Rename', onPress: () => setMode('rename') },
              { label: 'Change Privacy', onPress: () => setMode('privacy') },
              { label: 'Change Cover Photo', onPress: handleChangeCover },
            ] as { label: string; onPress: () => void }[]).map(opt => (
              <Pressable
                key={opt.label}
                style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}
                onPress={opt.onPress}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <View style={styles.deleteRow}>
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Delete Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'rename' && (
          <View style={styles.card}>
            <View style={styles.handle} />
            <Text style={styles.title}>Rename Gallery</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveRename}
              maxLength={60}
            />
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (!renameText.trim() || saving) && { opacity: 0.45 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSaveRename}
              disabled={!renameText.trim() || saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <View style={styles.deleteRow}>
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Delete Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'privacy' && (
          <View style={styles.card}>
            <View style={styles.handle} />
            <Text style={styles.title}>Change Privacy</Text>
            <View style={styles.privacyRow}>
              {PRIVACY_OPTIONS.map(opt => {
                const selected = draftPrivacy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.privacyOption,
                      selected && styles.privacyOptionSelected,
                      pressed && !selected && { opacity: 0.7 },
                    ]}
                    onPress={() => setDraftPrivacy(opt.value)}
                  >
                    <Text style={[styles.privacyLabel, selected && styles.privacyLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.privacyDesc, selected && styles.privacyDescSelected]}>
                      {opt.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                saving && { opacity: 0.45 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSavePrivacy}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <View style={styles.deleteRow}>
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Delete Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'cover' && (
          <View style={[styles.card, styles.cardTall]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Choose Cover Photo</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{gallery?.title}</Text>
            {coverPhotosLoading ? (
              <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 32 }} />
            ) : coverPhotos.length === 0 ? (
              <View style={styles.coverEmpty}>
                <Text style={styles.coverEmptyText}>No photos in this gallery yet.</Text>
              </View>
            ) : (
              <FlatList
                data={coverPhotos}
                keyExtractor={p => p.id}
                numColumns={3}
                style={{ marginHorizontal: -4 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.coverCell, pressed && { opacity: 0.75 }]}
                    onPress={() => onSelectCover(item.url)}
                  >
                    <Image source={{ uri: item.url }} style={styles.coverCellImage} resizeMode="cover" />
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    maxHeight: '80%',
  },
  cardTall: { maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  cancelRow: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelBtnText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  deleteRow: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    paddingTop: 16,
    alignItems: 'center',
  },
  deleteText: { fontSize: 13, fontWeight: '400', color: '#999' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginTop: 12,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnCancel: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  btnPrimary: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  privacyRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 20 },
  privacyOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  privacyOptionSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' },
  privacyLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 2 },
  privacyLabelSelected: { color: '#FF6B6B' },
  privacyDesc: { fontSize: 10, color: '#9CA3AF' },
  privacyDescSelected: { color: '#FF6B6B' },
  coverEmpty: { alignItems: 'center', paddingVertical: 32 },
  coverEmptyText: { color: '#9CA3AF', fontSize: 14 },
  coverCell: { width: COVER_CELL, height: COVER_CELL, margin: 1 },
  coverCellImage: { width: COVER_CELL, height: COVER_CELL },
});
