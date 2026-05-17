import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onSend: (text: string) => void;
  onSendImage: (uri: string) => void;
  editingMessage: any | null;
  onCancelEdit: () => void;
  disabled?: boolean;
};

export default function MessageInputBar({ onSend, onSendImage, editingMessage, onCancelEdit, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  useEffect(() => {
    setText(editingMessage ? (editingMessage.content ?? '') : '');
  }, [editingMessage]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPendingImageUri(result.assets[0].uri);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View>
      <Modal
        visible={pendingImageUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingImageUri(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            {pendingImageUri && (
              <Image source={{ uri: pendingImageUri }} style={styles.previewImage} />
            )}
            <Pressable
              style={styles.previewSend}
              onPress={() => {
                if (pendingImageUri) onSendImage(pendingImageUri);
                setPendingImageUri(null);
              }}
            >
              <Text style={styles.previewSendText}>Send</Text>
            </Pressable>
            <Pressable style={styles.previewCancel} onPress={() => setPendingImageUri(null)}>
              <Text style={styles.previewCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {editingMessage && (
        <View style={styles.editBanner}>
          <Text style={styles.editLabel}>Editing message</Text>
          <Pressable onPress={onCancelEdit} hitSlop={8}><Text style={styles.editClose}>✕</Text></Pressable>
        </View>
      )}
      <View style={styles.bar}>
        <Pressable onPress={handlePickImage} style={styles.imageBtn}>
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
        </Pressable>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#9CA3AF"
          multiline
          autoCorrect={true}
          spellCheck={true}
          autoCapitalize="sentences"
          returnKeyType="default"
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8 },
  editLabel: { fontSize: 13, color: '#6b7280' },
  editClose: { fontSize: 16, color: '#9CA3AF' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8, backgroundColor: '#fff' },
  imageBtn: { paddingBottom: 2 },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#F3F4F6' },
  sendIcon: { fontSize: 18, color: '#fff' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 },
  previewImage: { width: 240, height: 240, borderRadius: 12, resizeMode: 'cover' },
  previewSend: { width: 240, height: 44, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  previewSendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewCancel: { paddingVertical: 8 },
  previewCancelText: { color: '#9CA3AF', fontSize: 15 },
});
