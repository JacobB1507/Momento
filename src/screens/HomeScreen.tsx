import React, { useCallback, useState } from 'react';
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
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import { fetchGalleryPhotos, fetchUserGalleries } from '../lib/galleries';
import type { Gallery, GalleryPrivacy, Photo } from '../types/database';

const CARD_GAP = 12;
const SCREEN_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const PLACEHOLDER_COLORS = [
  '#FF6B6B',
  '#FF8E53',
  '#F97316',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

const COVER_CELL = Math.floor((SCREEN_WIDTH - 48 - 4) / 3);

function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function GalleryCard({ gallery, onPress, onLongPress }: { gallery: Gallery; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
      <View style={[styles.cardImage, { backgroundColor: placeholderColor(gallery.id) }]}>
        {gallery.cover_photo_url ? (
          <Image source={{ uri: gallery.cover_photo_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.cardInitial}>{gallery.title.charAt(0).toUpperCase()}</Text>
        )}
        <View style={styles.cardOverlay} />
        {gallery.role === 'member' && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Invited</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{gallery.title}</Text>
        <Text style={styles.cardDate}>{formatDate(gallery.created_at)}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🖼️</Text>
      <Text style={styles.emptyTitle}>No galleries yet</Text>
      <Text style={styles.emptySubtitle}>Tap + to create your first gallery or get invited to one.</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionGallery, setActionGallery] = useState<Gallery | null>(null);
  const [sheetMode, setSheetMode] = useState<'actions' | 'rename' | 'privacy' | 'cover' | null>(null);
  const [renameText, setRenameText] = useState('');
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>('friends');
  const [saving, setSaving] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverPhotosLoading, setCoverPhotosLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      setError(null);
      const data = await fetchUserGalleries(session.user.id);
      setGalleries(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load galleries');
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const closeSheet = () => { setSheetMode(null); setActionGallery(null); };

  const handleLongPress = useCallback((gallery: Gallery) => {
    if (gallery.role !== 'owner') return;
    setActionGallery(gallery);
    setSheetMode('actions');
  }, []);

  const handleRename = () => {
    setRenameText(actionGallery?.title ?? '');
    setSheetMode('rename');
  };

  const handleSaveRename = async () => {
    const trimmed = renameText.trim();
    if (!trimmed || !actionGallery) return;
    setSaving(true);
    const { error } = await supabase.from('galleries').update({ title: trimmed }).eq('id', actionGallery.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await load();
    closeSheet();
  };

  const handleChangePrivacy = () => {
    setDraftPrivacy(actionGallery?.privacy ?? 'friends');
    setSheetMode('privacy');
  };

  const handleSavePrivacy = async () => {
    if (!actionGallery) return;
    setSaving(true);
    const { error } = await supabase.from('galleries').update({ privacy: draftPrivacy }).eq('id', actionGallery.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await load();
    closeSheet();
  };

  const handleChangeCover = async () => {
    if (!actionGallery) return;
    setSheetMode('cover');
    setCoverPhotosLoading(true);
    try {
      const photos = await fetchGalleryPhotos(actionGallery.id);
      setCoverPhotos(photos);
    } catch {
      setCoverPhotos([]);
    } finally {
      setCoverPhotosLoading(false);
    }
  };

  const handleSelectCover = async (photoUrl: string) => {
    const id = actionGallery?.id;
    if (!id) return;
    closeSheet();
    const { error } = await supabase.from('galleries').update({ cover_photo_url: photoUrl }).eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    await load();
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
            const id = actionGallery?.id;
            closeSheet();
            if (!id) return;
            const { error } = await supabase.from('galleries').delete().eq('id', id);
            if (error) { Alert.alert('Error', error.message); return; }
            setGalleries(prev => prev.filter(g => g.id !== id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Galleries</Text>
        {galleries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{galleries.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={galleries}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
              <GalleryCard
                gallery={item}
                onPress={() =>
                  rootNav?.navigate('GalleryDetail', {
                    galleryId: item.id,
                  })
                }
                onLongPress={() => handleLongPress(item)}
              />
            )}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B6B"
              colors={['#FF6B6B']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal
        visible={sheetMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.sheetDismiss} onPress={closeSheet} />

          {/* ── Action list ── */}
          {sheetMode === 'actions' && (
            <View style={styles.sheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle} numberOfLines={1}>{actionGallery?.title}</Text>
              {([
                { label: 'Rename', onPress: handleRename },
                { label: 'Change Privacy', onPress: handleChangePrivacy },
                { label: 'Change Cover Photo', onPress: handleChangeCover },
              ] as { label: string; onPress: () => void }[]).map(opt => (
                <Pressable key={opt.label} style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.6 }]} onPress={opt.onPress}>
                  <Text style={styles.sheetOptionText}>{opt.label}</Text>
                </Pressable>
              ))}
              <Pressable style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.6 }]} onPress={handleDelete}>
                <Text style={[styles.sheetOptionText, styles.sheetDestructive]}>Delete</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.7 }]} onPress={closeSheet}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* ── Rename ── */}
          {sheetMode === 'rename' && (
            <View style={styles.sheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Rename Gallery</Text>
              <TextInput
                style={styles.sheetInput}
                value={renameText}
                onChangeText={setRenameText}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSaveRename}
                maxLength={60}
              />
              <View style={styles.sheetRow}>
                <Pressable style={({ pressed }) => [styles.sheetBtn, pressed && { opacity: 0.7 }]} onPress={closeSheet}>
                  <Text style={styles.sheetBtnCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnPrimary, (!renameText.trim() || saving) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}
                  onPress={handleSaveRename}
                  disabled={!renameText.trim() || saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sheetBtnPrimaryText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Change Privacy ── */}
          {sheetMode === 'privacy' && (
            <View style={styles.sheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Change Privacy</Text>
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
              <View style={styles.sheetRow}>
                <Pressable style={({ pressed }) => [styles.sheetBtn, pressed && { opacity: 0.7 }]} onPress={closeSheet}>
                  <Text style={styles.sheetBtnCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnPrimary, saving && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}
                  onPress={handleSavePrivacy}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sheetBtnPrimaryText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Cover Photo Picker ── */}
          {sheetMode === 'cover' && (
            <View style={[styles.sheetCard, styles.sheetCardTall]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Choose Cover Photo</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>{actionGallery?.title}</Text>
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
                      onPress={() => handleSelectCover(item.url)}
                    >
                      <Image source={{ uri: item.url }} style={styles.coverCellImage} resizeMode="cover" />
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              )}
              <Pressable style={({ pressed }) => [styles.sheetCancel, { marginTop: 8 }, pressed && { opacity: 0.7 }]} onPress={closeSheet}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  countBadge: {
    marginLeft: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.88 },
  cardImage: {
    width: '100%',
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  memberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  memberBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#9CA3AF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  retryButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryText: { color: '#FF6B6B', fontWeight: '600' },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: { flex: 1 },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    maxHeight: '80%',
  },
  sheetCardTall: { maxHeight: '85%' },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  sheetOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  sheetOptionText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  sheetDestructive: { color: '#EF4444' },
  sheetCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetCancelText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
  sheetInput: {
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
  sheetRow: { flexDirection: 'row', gap: 12 },
  sheetBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sheetBtnCancel: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  sheetBtnPrimary: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
