import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos, leaveGallery } from '../lib/galleries';
import type { GalleryPrivacy, Photo } from '../types/database';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const GRID_GAP = 8;
const NUM_COLS = 3;
const GRID_ITEM_WIDTH = (WINDOW_WIDTH * 0.88 - 48 - GRID_GAP * (NUM_COLS - 1)) / NUM_COLS;

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'private', label: 'Private', description: 'Only members', icon: 'lock-closed-outline' },
  { value: 'friends', label: 'Friends', description: 'Your friends only', icon: 'people-outline' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento', icon: 'globe-outline' },
];

type ViewerRole = 'owner' | 'admin' | 'member' | 'viewer';

type Props = {
  visible: boolean;
  galleryId: string;
  currentPrivacy: GalleryPrivacy;
  onClose: () => void;
  onPrivacySaved: (privacy: GalleryPrivacy) => void;
  onGalleryDeleted: () => void;
  onTransferOwnership?: () => void;
  onCoverPhotoUpdated?: () => void;
  isOwner?: boolean;
  onLeft?: () => void;
  viewerRole?: ViewerRole;
  sortMode?: 'newest' | 'oldest' | 'contributor';
  onChangeSortMode?: (mode: 'newest' | 'oldest' | 'contributor') => void;
  onLeaveGallery?: () => void;
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
  isOwner,
  onLeft,
  viewerRole = isOwner ? 'owner' : 'viewer',
  sortMode = 'newest',
  onChangeSortMode,
  onLeaveGallery,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>(currentPrivacy);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'main' | 'cover-picker'>('main');
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverState, setCoverState] = useState<'idle' | 'loading' | 'saving'>('idle');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);

  const isDirty = draftPrivacy !== currentPrivacy;
  const [tab, setTab] = useState<'filter' | 'settings'>('settings');
  const hasSettingsTab = viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'member';
  const canEditPrivacy = viewerRole === 'owner' || viewerRole === 'admin';

  useEffect(() => {
    if (visible) { setDraftPrivacy(currentPrivacy); setMode('main'); setTab('settings'); }
  }, [visible, currentPrivacy]);

  useEffect(() => {
    if (!visible || !galleryId) return;
    (async () => {
      const [{ count: pc }, { count: mc }] = await Promise.all([
        supabase
          .from('gallery_photos')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', galleryId),
        supabase
          .from('gallery_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('gallery_id', galleryId)
          .eq('status', 'accepted'),
      ]);
      setPhotoCount(pc ?? 0);
      setMemberCount(mc ?? 0);
    })();
  }, [visible, galleryId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('galleries').update({ privacy: draftPrivacy }).eq('id', galleryId);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onPrivacySaved(draftPrivacy);
    onClose();
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave this gallery?',
      "You'll stop seeing its photos and updates.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await leaveGallery(galleryId);
            if (error) { Alert.alert('Error', error); return; }
            onClose();
            onLeft?.();
          },
        },
      ],
    );
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
                <Pressable onPress={() => setMode('main')} hitSlop={12} style={styles.pickerBackBtn}>
                  <Ionicons name="chevron-back" size={26} color="#111827" />
                </Pressable>
                <Text style={styles.pickerTitle}>Choose cover photo</Text>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color="#111827" />
                </Pressable>
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
              {/* Header */}
              <View style={styles.mainHeader}>
                <Text style={styles.title}>Gallery Settings</Text>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>

              {/* Tab bar */}
              {hasSettingsTab && (
                <View style={styles.tabBar}>
                  <Pressable style={[styles.tabBtn, tab === 'settings' && styles.tabBtnActive]} onPress={() => setTab('settings')}>
                    <Text style={[styles.tabBtnText, tab === 'settings' && styles.tabBtnTextActive]}>Settings</Text>
                  </Pressable>
                  <Pressable style={[styles.tabBtn, tab === 'filter' && styles.tabBtnActive]} onPress={() => setTab('filter')}>
                    <Text style={[styles.tabBtnText, tab === 'filter' && styles.tabBtnTextActive]}>Filter</Text>
                  </Pressable>
                </View>
              )}

              {/* FILTER TAB */}
              {(!hasSettingsTab || tab === 'filter') && (
                <View style={styles.filterContent}>
                  <Text style={styles.sectionLabel}>SORT</Text>
                  {(['newest', 'oldest', 'contributor'] as const).map((mode, idx, arr) => (
                    <React.Fragment key={mode}>
                      <Pressable
                        style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                        onPress={() => onChangeSortMode?.(mode)}
                      >
                        <Text style={styles.rowText}>
                          {mode === 'newest' ? 'Newest first' : mode === 'oldest' ? 'Oldest first' : 'By person'}
                        </Text>
                        <View style={[styles.radio, sortMode === mode && styles.radioSelected]}>
                          {sortMode === mode && <View style={styles.radioDot} />}
                        </View>
                      </Pressable>
                      {idx < arr.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                  ))}
                </View>
              )}

              {/* SETTINGS TAB */}
              {hasSettingsTab && tab === 'settings' && (
                <>
                  <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* STAT STRIP */}
                    <View style={styles.statStrip}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{photoCount}</Text>
                        <Text style={styles.statLabel}>{photoCount === 1 ? 'photo' : 'photos'}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{memberCount}</Text>
                        <Text style={styles.statLabel}>{memberCount === 1 ? 'member' : 'members'}</Text>
                      </View>
                    </View>

                    {/* PRIVACY — owner/admin only */}
                    {canEditPrivacy && (
                      <>
                        <Text style={styles.sectionLabel}>PRIVACY</Text>
                        {PRIVACY_OPTIONS.map((opt, idx) => {
                          const selected = draftPrivacy === opt.value;
                          return (
                            <React.Fragment key={opt.value}>
                              <Pressable
                                style={({ pressed }) => [styles.privacyRow, pressed && styles.rowPressed]}
                                onPress={() => setDraftPrivacy(opt.value)}
                              >
                                <Ionicons name={opt.icon} size={22} color="#4B5563" />
                                <View style={styles.privacyTextCol}>
                                  <Text style={styles.privacyName}>{opt.label}</Text>
                                  <Text style={styles.privacyDesc}>{opt.description}</Text>
                                </View>
                                <View style={[styles.radio, selected && styles.radioSelected]}>
                                  {selected && <View style={styles.radioDot} />}
                                </View>
                              </Pressable>
                              {idx < PRIVACY_OPTIONS.length - 1 && <View style={styles.separator} />}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}

                    {/* COVER PHOTO — owner/admin only */}
                    {canEditPrivacy && (
                      <>
                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>GALLERY</Text>
                        <Pressable
                          style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                          onPress={openCoverPicker}
                        >
                          <View style={styles.rowLeft}>
                            <Ionicons name="image-outline" size={22} color="#4B5563" />
                            <Text style={styles.rowText}>Change cover photo</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                        </Pressable>
                      </>
                    )}

                    {/* DANGER ZONE */}
                    <View style={styles.dangerContainer}>
                      {(viewerRole === 'admin' || viewerRole === 'member') && (
                        <Pressable
                          style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                          onPress={onLeaveGallery ?? handleLeave}
                        >
                          <View style={styles.rowLeft}>
                            <Ionicons name="exit-outline" size={22} color="#DC2626" />
                            <Text style={styles.dangerRowText}>Leave gallery</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                        </Pressable>
                      )}
                      {viewerRole === 'owner' && onTransferOwnership && (
                        <Pressable
                          style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                          onPress={onTransferOwnership}
                        >
                          <View style={styles.rowLeft}>
                            <Ionicons name="swap-horizontal-outline" size={22} color="#DC2626" />
                            <Text style={styles.dangerRowText}>Transfer ownership</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                        </Pressable>
                      )}
                      {viewerRole === 'owner' && (
                        <Pressable
                          style={({ pressed }) => [styles.settingsRow, pressed && styles.rowPressed]}
                          onPress={handleDelete}
                        >
                          <View style={styles.rowLeft}>
                            <Ionicons name="trash-outline" size={22} color="#DC2626" />
                            <Text style={styles.dangerRowText}>Delete gallery</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                        </Pressable>
                      )}
                    </View>

                  </ScrollView>

                  {/* BOTTOM BAR — privacy save, owner/admin only */}
                  {canEditPrivacy && (
                    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                      <Pressable
                        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => setDraftPrivacy(currentPrivacy)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.saveBtn, isDirty ? styles.saveBtnActive : styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!isDirty || saving}
                      >
                        {saving
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={[styles.saveBtnText, isDirty ? styles.saveBtnTextActive : styles.saveBtnTextDisabled]}>Save</Text>
                        }
                      </Pressable>
                    </View>
                  )}
                </>
              )}
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
    width: '88%',
    maxHeight: WINDOW_HEIGHT * 0.88,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardPicker: { maxHeight: WINDOW_HEIGHT * 0.7 },

  // Main mode
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingBottom: 8 },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  // Privacy rows
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  privacyTextCol: { flex: 1, marginLeft: 12 },
  privacyName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  privacyDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#111827' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  // Shared row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rowPressed: { backgroundColor: '#F9FAFB' },

  // Danger zone
  dangerContainer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  dangerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  dangerRowText: { fontSize: 15, fontWeight: '500', color: '#DC2626' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: { backgroundColor: '#111827' },
  saveBtnDisabled: { backgroundColor: '#E5E7EB' },
  saveBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtnTextActive: { color: '#FFFFFF' },
  saveBtnTextDisabled: { color: '#9CA3AF' },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabBtnTextActive: { color: '#111827' },

  // Filter tab
  filterContent: { paddingBottom: 12 },

  // Cover picker
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pickerBackBtn: { marginRight: 4 },
  pickerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  gridContent: { paddingHorizontal: 24, paddingBottom: 16 },
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
