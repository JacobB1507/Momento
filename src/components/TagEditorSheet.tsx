import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TAG_PALETTE, ProfileTag, createTag, updateTag } from '../lib/tags';
import styles from '../styles/manageTagsStyles';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  tag?: ProfileTag;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function TagEditorSheet({ visible, mode, tag, userId, onClose, onSaved }: Props) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<string>(TAG_PALETTE[0]);
  const [emoji, setEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  const isUserIdValid = typeof userId === 'string' && userId.length > 0;

  useEffect(() => {
    if (visible) {
      setLabel(mode === 'edit' && tag ? tag.label : '');
      setColor(mode === 'edit' && tag ? tag.color : TAG_PALETTE[0]);
      setEmoji(mode === 'edit' && tag ? (tag.emoji ?? '') : '');
      setSaving(false);
    }
  }, [visible, mode, tag]);

  const canSave = label.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!isUserIdValid) {
      Alert.alert('Not signed in', 'Please wait a moment and try again.');
      return;
    }
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        await createTag({ userId, label: trimmedLabel, color, emoji: emoji.trim() || null });
      } else if (mode === 'edit' && tag) {
        await updateTag({ tagId: tag.id, label: trimmedLabel, color, emoji: emoji.trim() || null });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save tag.');
      setSaving(false);
    }
  };

  const topRow = TAG_PALETTE.slice(0, 4) as string[];
  const bottomRow = TAG_PALETTE.slice(4) as string[];

  const renderColorRow = (row: string[]) => (
    <View style={styles.colorRow}>
      {row.map((c) => {
        const selected = color === c;
        return (
          <Pressable key={c} onPress={() => setColor(c)}>
            <View style={[styles.colorSwatchOuter, { backgroundColor: selected ? c : 'transparent' }]}>
              <View style={[styles.colorSwatchInner, { backgroundColor: c }]}>
                {selected && <Ionicons name="checkmark" size={20} color="white" />}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.headerButton}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{mode === 'create' ? 'New Tag' : 'Edit Tag'}</Text>
          <Pressable onPress={handleSave} disabled={!canSave || !isUserIdValid || saving}>
            <Text style={[styles.headerButtonRight, { opacity: (canSave && isUserIdValid && !saving) ? 1 : 0.4 }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>Label</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              value={label}
              onChangeText={setLabel}
              placeholder="Tag name"
              placeholderTextColor="#C7C7CC"
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.charCount}>{label.length}/30</Text>

          <Text style={styles.sectionHeader}>Color</Text>
          <View style={styles.colorGrid}>
            {renderColorRow(topRow)}
            {renderColorRow(bottomRow)}
          </View>

          <Text style={styles.sectionHeader}>Emoji (optional)</Text>
          <TextInput
            style={styles.emojiInput}
            value={emoji}
            onChangeText={setEmoji}
            placeholder="e.g. 🏖️"
            placeholderTextColor="#C7C7CC"
            maxLength={8}
          />
          {emoji.length > 0 && (
            <Pressable style={styles.clearEmojiButton} onPress={() => setEmoji('')}>
              <Text style={styles.clearEmojiText}>Tap to remove</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
