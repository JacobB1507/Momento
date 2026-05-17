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
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos } from '../lib/galleries';
import { validateGalleryTitle, sanitizeText } from '../lib/sanitize';
import { reportError } from '../lib/errorReport';
import type { Gallery, GalleryPrivacy, Photo } from '../types/database';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_GAP = 8;
const CARD_PADDING = 20;
const ITEM_WIDTH = Math.floor(
  (WINDOW_WIDTH * 0.88 - CARD_PADDING * 2 - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS,
);

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'private', label: 'Private', subtitle: 'Only visible to contributors', icon: 'lock-closed-outline' },
  { value: 'friends', label: 'Friends', subtitle: 'Only visible to friends', icon: 'people-outline' },
  { value: 'public', label: 'Public', subtitle: 'Visible to anyone', icon: 'globe-outline' },
];

type SheetMode = 'actions' | 'rename' | 'privacy' | 'cover';

type Props = {
  visible: boolean;
  onClose: () => void;
  gallery: Gallery;
  currentUserId: string;
  onPinToggled: () => void;
  onRenamed: () => void;
  onPrivacyChanged: () => void;
  onCoverPhotoUpdated: () => void;
  onDeleted: () => void;
};

export function GalleryLongPressSheet({
  visible,
  onClose,
  gallery,
  currentUserId,
  onPinToggled,
  onRenamed,
  onPrivacyChanged,
  onCoverPhotoUpdated,
  onDeleted,
}: Props) {
  const [mode, setMode] = useState<SheetMode>('actions');
  const [renameText, setRenameText] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>(gallery.privacy);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<Photo[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const isOwner = gallery.created_by === currentUserId;

  useEffect(() => {
    if (visible) {
      setMode('actions');
      setRenameText(gallery.title);
      setRenameError(null);
      setDraftPrivacy(gallery.privacy);
      setCoverPhotos([]);
      setSelectedPhotoId(null);
    }
  }, [visible]);

  const openRename = () => {
    setRenameText(gallery.title);
    setRenameError(null);
    setMode('rename');
  };

  const openPrivacy = () => {
    setDraftPrivacy(gallery.privacy);
    setMode('privacy');
  };

  const openCover = () => {
    setMode('cover');
    setCoverLoading(true);
    fetchGalleryPhotos(gallery.id)
      .then(p => setCoverPhotos(p))
      .catch(err => reportError('GalleryLongPressSheet.openCover', err))
      .finally(() => setCoverLoading(false));
  };

  const handleRenameSave = async () => {
    const clean = sanitizeText(renameText);
    const validation = validateGalleryTitle(clean);
    if (!validation.ok) {
      setRenameError(validation.error ?? 'Invalid title');
      return;
    }
    if (clean === gallery.title) {
      setMode('actions');
      onClose();
      return;
    }
    setRenameSaving(true);
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ title: clean })
        .eq('id', gallery.id);
      if (error) { Alert.alert('Error', 'Could not rename gallery.'); return; }
      setMode('actions');
      onClose();
      onRenamed();
    } finally {
      setRenameSaving(false);
    }
  };

  const handlePrivacySave = async () => {
    if (draftPrivacy === gallery.privacy) {
      setMode('actions');
      onClose();
      return;
    }
    setPrivacySaving(true);
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ privacy: draftPrivacy })
        .eq('id', gallery.id);
      if (error) { Alert.alert('Error', 'Could not update privacy.'); return; }
      setMode('actions');
      onClose();
      onPrivacyChanged();
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleCoverSelect = async (photoId: string) => {
    if (coverSaving) return;
    setSelectedPhotoId(photoId);
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
      const { error } = await supabase
        .from('galleries')
        .update({ cover_photo_url: photo.url })
        .eq('id', gallery.id);
      if (error) { Alert.alert('Error', 'Could not update cover photo.'); return; }
      setMode('actions');
      onClose();
      onCoverPhotoUpdated();
    } finally {
      setCoverSaving(false);
      setSelectedPhotoId(null);
    }
  };

  const handlePinToggle = () => { onClose(); onPinToggled(); };
  const handleDelete = () => { onClose(); onDeleted(); };

  const modeTitle =
    mode === 'actions' ? gallery.title :
    mode === 'rename' ? 'Rename' :
    mode === 'privacy' ? 'Privacy' : 'Cover Photo';

  const renderActions = () => {
    const isPinned = !!gallery.pinned;
    return (
      <>
        <ActionRow icon="pin" label={isPinned ? 'Unpin' : 'Pin to Top'} onPress={handlePinToggle} disabled={false} />
        <View style={styles.divider} />
        <ActionRow icon="pencil-outline" label="Rename" onPress={openRename} disabled={!isOwner} />
        <View style={styles.divider} />
        <ActionRow icon="image-outline" label="Change Cover Photo" onPress={openCover} disabled={!isOwner} />
        <View style={styles.divider} />
        <ActionRow icon="eye-outline" label="Change Privacy" onPress={openPrivacy} disabled={!isOwner} />
        <View style={styles.divider} />
        <ActionRow icon="trash-outline" label="Delete" onPress={handleDelete} disabled={!isOwner} destructive />
      </>
    );
  };

  const renameSaveDisabled = renameSaving || !renameText.trim() || sanitizeText(renameText) === gallery.title;

  const renderRename = () => (
    <View style={styles.modeContent}>
      <TextInput
        style={[styles.renameInput, renameError ? styles.renameInputError : null]}
        value={renameText}
        onChangeText={text => { setRenameText(text); setRenameError(null); }}
        maxLength={50}
        autoFocus
        placeholder="Gallery name"
        placeholderTextColor="#9CA3AF"
        returnKeyType="done"
        onSubmitEditing={renameSaveDisabled ? undefined : handleRenameSave}
      />
      {renameError ? <Text style={styles.renameErrorText}>{renameError}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.saveBtn, renameSaveDisabled && styles.saveBtnDisabled, pressed && !renameSaveDisabled && { opacity: 0.8 }]}
        onPress={handleRenameSave}
        disabled={renameSaveDisabled}
      >
        {renameSaving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.saveBtnText}>Save</Text>}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        onPress={() => setMode('actions')}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );

  const renderPrivacy = () => (
    <View style={styles.modeContent}>
      {PRIVACY_OPTIONS.map(opt => {
        const selected = draftPrivacy === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={({ pressed }) => [styles.privacyRow, pressed && { opacity: 0.7 }]}
            onPress={() => setDraftPrivacy(opt.value)}
          >
            <View style={styles.privacyRowLeft}>
              <View style={styles.privacyIcon}>
                <Ionicons name={opt.icon} size={20} color="#374151" />
              </View>
              <View>
                <Text style={styles.privacyLabel}>{opt.label}</Text>
                <Text style={styles.privacySubtitle}>{opt.subtitle}</Text>
              </View>
            </View>
            {selected && <Ionicons name="checkmark" size={20} color="#FF6B6B" />}
          </Pressable>
        );
      })}
      <Pressable
        style={({ pressed }) => [styles.saveBtn, privacySaving && styles.saveBtnDisabled, pressed && !privacySaving && { opacity: 0.8 }]}
        onPress={handlePrivacySave}
        disabled={privacySaving}
      >
        {privacySaving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.saveBtnText}>Save</Text>}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        onPress={() => setMode('actions')}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );

  const renderCover = () => {
    if (coverLoading) {
      return (
        <View style={styles.coverCenter}>
          <ActivityIndicator color="#FF6B6B" size="large" />
        </View>
      );
    }
    if (coverPhotos.length === 0) {
      return (
        <View style={styles.coverCenter}>
          <Text style={styles.coverEmptyText}>No photos yet — upload some first.</Text>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, styles.coverEmptyBtn, pressed && { opacity: 0.7 }]}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>Close</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={coverPhotos}
        keyExtractor={p => p.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        style={coverSaving ? { opacity: 0.5 } : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => !coverSaving && handleCoverSelect(item.id)}
            style={styles.gridCell}
          >
            <Image source={{ uri: item.url }} style={styles.gridCellImage} resizeMode="cover" />
            {selectedPhotoId === item.id && (
              <View style={styles.selectedOverlay}>
                <Ionicons name="checkmark-circle" size={28} color="#fff" />
              </View>
            )}
          </Pressable>
        )}
      />
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, mode === 'cover' && coverPhotos.length > 0 && styles.cardTall]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            {mode !== 'actions' ? (
              <Pressable onPress={() => setMode('actions')} hitSlop={12} style={styles.headerSide}>
                <Ionicons name="chevron-back" size={24} color="#374151" />
              </Pressable>
            ) : (
              <View style={styles.headerSide} />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{modeTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={[styles.headerSide, styles.headerSideRight]}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          {mode === 'actions' && renderActions()}
          {mode === 'rename' && renderRename()}
          {mode === 'privacy' && renderPrivacy()}
          {mode === 'cover' && renderCover()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled: boolean;
  destructive?: boolean;
};

function ActionRow({ icon, label, onPress, disabled, destructive }: ActionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionRow,
        disabled && styles.actionRowDisabled,
        !disabled && pressed && styles.actionRowPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionRowIcon}>
        <Ionicons name={icon} size={22} color={destructive ? '#EF4444' : '#374151'} />
      </View>
      <Text style={[styles.actionRowLabel, destructive && styles.actionRowLabelDestructive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: CARD_PADDING,
    width: '88%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTall: { maxHeight: WINDOW_HEIGHT * 0.7 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSide: { width: 32 },
  headerSideRight: { alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  divider: { height: 1, backgroundColor: '#F3F4F6' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  actionRowDisabled: { opacity: 0.4 },
  actionRowPressed: { backgroundColor: '#F9FAFB' },
  actionRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionRowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  actionRowLabelDestructive: { color: '#EF4444' },

  modeContent: { gap: 12, marginTop: 4 },

  renameInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  renameInputError: { borderColor: '#EF4444' },
  renameErrorText: { fontSize: 13, color: '#EF4444' },

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
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cancelBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#111827', fontSize: 16, fontWeight: '600' },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 4,
  },
  privacyRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  privacySubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  gridContent: { paddingBottom: 8 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCell: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gridCellImage: { width: ITEM_WIDTH, height: ITEM_WIDTH },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  coverCenter: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  coverEmptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  coverEmptyBtn: { width: '100%' },
});
