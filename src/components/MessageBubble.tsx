import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { canEditOrDelete } from '../lib/messages';

type MessageItem = {
  id: string;
  content: string;
  image_url?: string | null;
  sender_id: string;
  created_at: string;
  edited?: boolean;
  deleted?: boolean;
  read?: boolean;
  read_at?: string | null;
};

type Props = {
  message: MessageItem;
  currentUserId: string;
  onEdit: (message: MessageItem) => void;
  onDelete: (message: MessageItem) => void;
  isLast: boolean;
  activeMessageId?: string | null;
  setActiveMessageId?: (id: string | null) => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatReadTime(readAtIso: string): string {
  const readMs = new Date(readAtIso).getTime();
  if (isNaN(readMs)) return 'Read';
  const diffSec = Math.floor((Date.now() - readMs) / 1000);
  if (diffSec < 60) return 'Read just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Read ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Read ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `Read ${diffDay}d ago`;
  const d = new Date(readAtIso);
  return `Read ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function MessageBubble({ message, currentUserId, onEdit, onDelete, isLast, activeMessageId, setActiveMessageId }: Props) {
  const navigation = useNavigation<any>();
  const isOwn = message.sender_id === currentUserId;
  const isMenuOpen = activeMessageId === message.id;
  const showReadIndicator = isOwn && isLast && message.read === true && !!message.read_at;
  if (isOwn && isLast) {
    console.warn('[MessageBubble] last own msg state', {
      msgId: message.id,
      isOwn,
      isLast,
      read: message.read,
      readType: typeof message.read,
      read_at: message.read_at,
      read_at_type: typeof message.read_at,
      showReadIndicator,
    });
  }
  const [within2Mins, setWithin2Mins] = useState(false);

  const handleLongPress = async () => {
    if (!isOwn || message.deleted) return;
    const canAct = await canEditOrDelete(message.created_at);
    setWithin2Mins(canAct);
    setActiveMessageId?.(message.id);
  };

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <Pressable
        onPress={
          message.image_url != null && message.image_url !== '' && !message.deleted
            ? () => navigation.navigate('PhotoViewer', {
                photos: [{
                  id: message.id,
                  url: message.image_url,
                  uploaded_by: message.sender_id,
                  created_at: message.created_at,
                }],
                initialIndex: 0,
                galleryTitle: undefined,
              })
            : undefined
        }
        onLongPress={isOwn && !message.deleted ? handleLongPress : undefined}
        delayLongPress={300}
        style={{ position: 'relative' }}
      >
        {isMenuOpen && (
          <>
            <TouchableOpacity
              style={styles.overlay}
              onPress={() => setActiveMessageId?.(null)}
              activeOpacity={1}
            />
            <View style={styles.menu}>
              {within2Mins ? (
                <>
                  <Pressable style={styles.menuRow} onPress={() => { onEdit(message); setActiveMessageId?.(null); }}>
                    <Ionicons name="pencil-outline" size={15} color="#fff" />
                    <Text style={styles.menuTextWhite}>Edit</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable style={styles.menuRow} onPress={() => { onDelete(message); setActiveMessageId?.(null); }}>
                    <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                    <Text style={styles.menuTextRed}>Delete</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.menuTextGrey}>Can no longer edit or delete</Text>
              )}
            </View>
          </>
        )}
        {message.deleted ? (
          <View style={styles.deletedPill}>
            <Text style={styles.deletedText}>Message deleted</Text>
          </View>
        ) : message.image_url != null && message.image_url !== '' ? (
          <Image source={{ uri: message.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={isOwn ? styles.textOwn : styles.textOther}>{message.content}</Text>
          </View>
        )}
      </Pressable>
      {message.edited && !message.deleted && <Text style={styles.edited}>edited</Text>}
      {isLast && <Text style={styles.time}>{formatTime(message.created_at)}</Text>}
      {showReadIndicator && message.read_at ? (
        <Text style={styles.readIndicator}>{formatReadTime(message.read_at)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 3 },
  wrapperOwn: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  overlay: { position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999, zIndex: 998, backgroundColor: 'transparent' },
  menu: { position: 'absolute', top: '100%', right: 0, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 4, zIndex: 1000, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  menuTextWhite: { color: '#fff', fontSize: 14, fontWeight: '500' },
  menuTextRed: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
  menuTextGrey: { color: '#9ca3af', fontSize: 12, paddingHorizontal: 14, paddingVertical: 10 },
  menuDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 8 },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleOwn: { backgroundColor: '#FF6B6B', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
  textOwn: { color: '#fff', fontSize: 15 },
  textOther: { color: '#111827', fontSize: 15 },
  deletedPill: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  deletedText: { color: '#9ca3af', fontStyle: 'italic', fontSize: 14 },
  image: { width: 200, height: 200, borderRadius: 12 },
  edited: { fontSize: 10, color: '#9ca3af', marginTop: 2, marginHorizontal: 4 },
  time: { fontSize: 10, color: '#9CA3AF', marginTop: 2, marginHorizontal: 4 },
  readIndicator: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
    marginRight: 4,
    textAlign: 'right',
  },
});
