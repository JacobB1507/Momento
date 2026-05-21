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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchGalleryPhotos } from '../lib/galleries';
import { supabase } from '../lib/supabase';
import { getMyTags, getGalleryTags, applyTagToGallery, removeTagFromGallery } from '../lib/tags';
import type { ProfileTag } from '../lib/tags';
import type { Gallery, GalleryPrivacy, Photo } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const NUM_COLUMNS = 3;
const COVER_CELL = Math.floor((SCREEN_WIDTH - 48 - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS);

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

type Mode = 'actions' | 'rename' | 'privacy' | 'cover' | 'tags';

type Props = {
  gallery: Gallery | null;
  onClose: () => void;
  onSaveRename: (title: string) => Promise<void>;
  onSavePrivacy: (privacy: GalleryPrivacy) => Promise<void>;
  onSelectCover: (photoUrl: string) => Promise<void>;
  onDelete: () => void;
  currentUserId?: string;
};

export function GalleryActionSheet({
  gallery,
  onClose,
  onSaveRename,
  onSavePrivacy,
  onSelectCover,
  onDelete,
  currentUserId,
}: Props) {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>('actions');
  const [renameText, setRenameText] = useState('');
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>('friends');
  const [saving, setSaving] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverPhotosLoading, setCoverPhotosLoading] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);
  const [userTags, setUserTags] = useState<ProfileTag[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<Set<string>>(new Set());
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsSaving, setTagsSaving] = useState(false);

  const isOwner = !!currentUserId && !!gallery && (gallery as any).created_by === currentUserId;
  const isAdmin = gallery?.role === 'admin';
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (gallery) {
      setMode('actions');
      setRenameText(gallery.title);
      setDraftPrivacy(gallery.privacy);
      setUserTags([]);
      setAppliedTagIds(new Set());
    }
  }, [gallery?.id]);

  useEffect(() => {
    if (mode !== 'tags' || !gallery || !user?.id) return;
    let cancelled = false;
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        const [tags, galleryTags] = await Promise.all([
          getMyTags(user.id!),
          getGalleryTags(gallery.id),
        ]);
        if (!cancelled) {
          setUserTags(tags);
          setAppliedTagIds(new Set(galleryTags.map(t => t.tag_id)));
        }
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    };
    loadTags();
    return () => { cancelled = true; };
  }, [mode, gallery?.id]);

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

  const handleCoverSelect = async (photoId: string) => {
    if (!gallery || coverSaving) return;
    setCoverSaving(true);
    try {
      const { data: photo, error: fetchError } = await supabase
        .from('gallery_photos')
        .select('url, gallery_id')
        .eq('id', photoId)
        .single();
      if (fetchError || !photo || photo.gallery_id !== gallery.id) {
        Alert.alert('Error', 'Could not update cover photo.');
        return;
      }
      await onSelectCover(photo.url);
      onClose();
    } finally {
      setCoverSaving(false);
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

  const handleToggleTag = async (tagId: string) => {
    if (tagsSaving || !gallery) return;
    const wasApplied = appliedTagIds.has(tagId);
    const newSet = new Set(appliedTagIds);
    if (wasApplied) newSet.delete(tagId); else newSet.add(tagId);
    setAppliedTagIds(newSet);
    setTagsSaving(true);
    try {
      if (wasApplied) await removeTagFromGallery(gallery.id, tagId);
      else await applyTagToGallery(gallery.id, tagId);
    } catch {
      setAppliedTagIds(appliedTagIds);
      Alert.alert("Couldn't update tags", 'Try again.');
    } finally {
      setTagsSaving(false);
    }
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
              { label: 'Rename', icon: null as React.ReactNode, onPress: () => setMode('rename') },
              { label: 'Tags', icon: <Ionicons name="pricetags-outline" size={20} color="#8E8E93" />, onPress: () => setMode('tags') },
              { label: 'Change Privacy', icon: null as React.ReactNode, onPress: () => setMode('privacy') },
              ...(canManage ? [{ label: 'Change Cover Photo', icon: null as React.ReactNode, onPress: handleChangeCover }] : []),
            ] as { label: string; icon: React.ReactNode; onPress: () => void }[]).map(opt => (
              <Pressable
                key={opt.label}
                style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}
                onPress={opt.onPress}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {opt.icon}
                  <Text style={styles.optionText}>{opt.label}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            {canManage && (
              <View style={styles.deleteRow}>
                <Pressable
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteText}>Delete Gallery</Text>
                </Pressable>
              </View>
            )}
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
            {canManage && (
              <View style={styles.deleteRow}>
                <Pressable
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteText}>Delete Gallery</Text>
                </Pressable>
              </View>
            )}
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
            {canManage && (
              <View style={styles.deleteRow}>
                <Pressable
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteText}>Delete Gallery</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {mode === 'tags' && (
          <View style={[styles.card, styles.cardTall]}>
            <View style={styles.handle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Pressable onPress={() => setMode('actions')} style={{ padding: 4, marginRight: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#007AFF" />
              </Pressable>
              <Text style={[styles.title, { flex: 1, textAlign: 'center', marginRight: 28 }]}>Tags</Text>
            </View>
            <Text style={styles.subtitle}>Tap to toggle which of your tags apply to this gallery.</Text>
            {tagsLoading ? (
              <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 32 }} />
            ) : userTags.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>You haven't created any tags yet.</Text>
                <Pressable onPress={() => { onClose(); navigation.navigate('ManageTags' as never); }}>
                  <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '500' }}>Create your first tag →</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 }}>
                {userTags.map((tag) => {
                  const applied = appliedTagIds.has(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      disabled={tagsSaving}
                      onPress={() => handleToggleTag(tag.id)}
                      style={{
                        height: 36,
                        paddingHorizontal: 14,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        backgroundColor: applied ? tag.color : 'white',
                        borderWidth: applied ? 0 : 1,
                        borderColor: '#E5E5EA',
                        opacity: tagsSaving ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: applied ? 'white' : '#1C1C1E', fontSize: 14, fontWeight: '500' }}>
                        {tag.emoji ? `${tag.emoji} ` : ''}{tag.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
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
              <View>
                <FlatList
                  data={coverPhotos}
                  keyExtractor={p => p.id}
                  numColumns={3}
                  columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
                  style={coverSaving ? { opacity: 0.5 } : undefined}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [styles.coverCell, pressed && { opacity: 0.75 }]}
                      onPress={() => handleCoverSelect(item.id)}
                      disabled={coverSaving}
                    >
                      <Image source={{ uri: item.url }} style={styles.coverCellImage} resizeMode="cover" />
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
                {coverSaving && (
                  <View style={styles.coverSavingOverlay}>
                    <ActivityIndicator color="#FF6B6B" size="large" />
                  </View>
                )}
              </View>
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
  coverCell: { width: COVER_CELL, height: COVER_CELL, borderRadius: 4, overflow: 'hidden' },
  coverCellImage: { width: COVER_CELL, height: COVER_CELL },
  coverSavingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
