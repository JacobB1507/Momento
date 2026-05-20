import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, FlatList,
  ActivityIndicator, Image, StyleSheet, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { syncContacts } from '../lib/contacts';
import type { MatchedContact } from '../lib/contacts';
import { sendFriendRequestById } from '../lib/friends';
import { supabase } from '../lib/supabase';

interface Props {
  visible: boolean;
  currentUserId: string;
  friendIds: string[];
  onDismiss: () => void;
}

const LETTER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];

function LetterAvatar({ name }: { name: string }) {
  const letter = name?.trim()?.[0]?.toUpperCase() ?? '?';
  const bg = LETTER_COLORS[letter.charCodeAt(0) % LETTER_COLORS.length];
  return (
    <View style={[s.avatar, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{letter}</Text>
    </View>
  );
}

function ContactRow({
  item,
  isAdded,
  isRequesting,
  onAdd,
}: {
  item: MatchedContact;
  isAdded: boolean;
  isRequesting: boolean;
  onAdd: () => void;
}) {
  const name = item.display_name || item.contactName || 'Unknown';
  return (
    <View style={s.row}>
      {item.avatar_url
        ? <Image source={{ uri: item.avatar_url }} style={s.avatar} />
        : <LetterAvatar name={name} />}
      <View style={s.nameWrap}>
        <Text style={s.displayName} numberOfLines={1}>{name}</Text>
        {item.username ? <Text style={s.username}>@{item.username}</Text> : null}
      </View>
      {isAdded ? (
        <View style={s.addedPill}>
          <Ionicons name="checkmark" size={12} color="#6B7280" />
          <Text style={s.addedText}>Added</Text>
        </View>
      ) : isRequesting ? (
        <ActivityIndicator size="small" color="#FF6B6B" />
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AddContactsModal({ visible, currentUserId, friendIds, onDismiss }: Props) {
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<MatchedContact[]>([]);
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
  const [requestingUserIds, setRequestingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const results = await syncContacts();
        console.log('[AddContactsModal] sync results:', {
          permissionGranted: results.permissionGranted,
          matchedCount: results.matched.length,
          unmatchedCount: results.unmatched.length,
          totalScanned: results.totalContactsScanned,
          friendIdsCount: friendIds.length,
        });
        if (cancelled) return;
        const filtered = results.matched.filter(c => !friendIds.includes(c.id));
        console.log('[AddContactsModal] filtered count:', filtered.length);
        if (!results.permissionGranted || filtered.length === 0) {
          try {
            await supabase
              .from('profiles')
              .update({ contacts_modal_shown_at: new Date().toISOString() })
              .eq('id', currentUserId);
          } catch (e) {
            console.warn('[AddContactsModal] silent-mark failed:', e);
          }
          onDismiss();
          return;
        }
        setMatched(filtered);
      } catch (e) {
        console.warn('[AddContactsModal] syncContacts failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible]);

  const handleAdd = useCallback(async (contact: MatchedContact) => {
    setRequestingUserIds(prev => new Set([...prev, contact.id]));
    try {
      const result = await sendFriendRequestById(currentUserId, contact.id);
      if (result === 'sent' || result === 'already_friends') {
        setAddedUserIds(prev => new Set([...prev, contact.id]));
      } else {
        Alert.alert('Could not send request', 'Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Could not send request', e?.message ?? 'Please try again.');
      console.warn('[AddContactsModal] sendFriendRequest failed:', e);
    } finally {
      setRequestingUserIds(prev => { const n = new Set(prev); n.delete(contact.id); return n; });
    }
  }, [currentUserId]);

  const handleDone = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ contacts_modal_shown_at: new Date().toISOString() })
        .eq('id', currentUserId);
    } catch (e) {
      console.warn('[AddContactsModal] contacts_modal_shown_at write failed:', e);
    }
    onDismiss();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleDone} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconRow}>
            <Ionicons name="people-outline" size={48} color="#FF6B6B" />
          </View>
          <Text style={s.heading}>Add your contacts!</Text>
          <Text style={s.subtitle}>We found people you know on Momento</Text>

          {loading ? (
            <View style={s.loadingWrap}><ActivityIndicator size="large" color="#FF6B6B" /></View>
          ) : (
            <FlatList
              data={matched}
              keyExtractor={item => item.id}
              style={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ContactRow
                  item={item}
                  isAdded={addedUserIds.has(item.id)}
                  isRequesting={requestingUserIds.has(item.id)}
                  onAdd={() => handleAdd(item)}
                />
              )}
            />
          )}

          <TouchableOpacity style={s.doneBtn} onPress={handleDone} activeOpacity={0.8}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '80%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, maxHeight: 560 },
  iconRow: { alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  loadingWrap: { height: 120, alignItems: 'center', justifyContent: 'center' },
  list: { maxHeight: 340 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  nameWrap: { flex: 1, marginRight: 8 },
  displayName: { fontSize: 15, fontWeight: '600', color: '#111' },
  username: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  addedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  addedText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  addBtn: { backgroundColor: '#FF6B6B', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  doneBtn: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  doneBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
