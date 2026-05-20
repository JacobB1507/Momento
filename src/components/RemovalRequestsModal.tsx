import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRemovalRequests, voteOnRemoval, deleteOwnPhoto } from '../lib/photoRemoval';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  galleryId: string;
  highlightedRequestId?: string | null;
};

type RemovalRequest = {
  id: string;
  photo_id: string;
  reason: string;
  requested_by_username: string | null;
  yes_votes: number;
  no_votes: number;
  created_at: string;
  uploaded_by: string | null;
  user_has_voted: boolean;
  member_count: number;
};

type EnrichedRequest = RemovalRequest & {
  photoUrl: string | null;
  requesterAvatar: string | null;
};

export function RemovalRequestsModal({ visible, onClose, galleryId, highlightedRequestId }: Props) {
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const data = await getRemovalRequests(galleryId, currentUserId) as RemovalRequest[];

    const photoIds = data.map(r => r.photo_id);
    const usernames = data.map(r => r.requested_by_username).filter(Boolean) as string[];

    const [{ data: photos }, { data: profiles }] = await Promise.all([
      photoIds.length
        ? supabase.from('gallery_photos').select('id, url').in('id', photoIds)
        : Promise.resolve({ data: [] }),
      usernames.length
        ? supabase.from('profiles').select('username, avatar_url').in('username', usernames)
        : Promise.resolve({ data: [] }),
    ]);

    const photoMap = new Map((photos ?? []).map((p: any) => [p.id, p.url]));
    const avatarMap = new Map((profiles ?? []).map((p: any) => [p.username, p.avatar_url]));

    setRequests(data.map(r => ({
      ...r,
      photoUrl: photoMap.get(r.photo_id) ?? null,
      requesterAvatar: r.requested_by_username ? avatarMap.get(r.requested_by_username) ?? null : null,
    })));
    setLoading(false);
  }, [galleryId, currentUserId]);

  const handleVote = async (requestId: string, vote: boolean) => {
    if (!currentUserId) return;
    const ok = await voteOnRemoval(requestId, currentUserId, vote);
    if (ok) await loadRequests();
    else Alert.alert('Error', 'Could not submit vote. Please try again.');
  };

  const handleOwnerDelete = async (photoId: string) => {
    const ok = await deleteOwnPhoto(photoId);
    if (ok) setRequests(prev => prev.filter(r => r.photo_id !== photoId));
    else Alert.alert('Error', 'Could not delete photo. Please try again.');
  };

  useEffect(() => {
    if (visible) loadRequests();
  }, [visible, loadRequests]);

  useEffect(() => {
    if (highlightedRequestId && requests.length > 0) {
      const index = requests.findIndex(r => r.id === highlightedRequestId);
      if (index >= 0) {
        setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true }), 300);
      }
    }
  }, [highlightedRequestId, requests]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.title}>Removal Requests</Text>
            {requests.length > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{requests.length}</Text></View>
            )}
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.7 }]}>
            <Text style={s.doneBtnText}>Done</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color="#FF6B6B" size="large" /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={requests}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            onScrollToIndexFailed={() => {}}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="checkmark-circle-outline" size={44} color="#9ca3af" />
                <Text style={s.emptyText}>No pending requests</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOwner = !!currentUserId && currentUserId === item.uploaded_by;
              const pct = item.member_count > 0
                ? Math.min(1, item.yes_votes / item.member_count)
                : 0;
              const isHighlighted = item.id === highlightedRequestId;
              return (
                <View style={[s.card, isHighlighted && s.cardHighlighted]}>
                  <View style={s.cardTop}>
                    <View>
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={s.photo} />
                      ) : (
                        <View style={[s.photo, s.photoPlaceholder]}>
                          <Ionicons name="image-outline" size={28} color="#d1d5db" />
                        </View>
                      )}
                      {isOwner && (
                        <Pressable style={s.photoDeleteBtn} onPress={() => handleOwnerDelete(item.photo_id)}>
                          <Ionicons name="trash" size={13} color="#fff" />
                        </Pressable>
                      )}
                    </View>
                    <View style={s.info}>
                      <View style={s.requesterRow}>
                        {item.requesterAvatar ? (
                          <Image source={{ uri: item.requesterAvatar }} style={s.avatar} />
                        ) : (
                          <View style={[s.avatar, s.avatarPlaceholder]}>
                            <Text style={s.avatarLetter}>{item.requested_by_username?.[0]?.toUpperCase() ?? '?'}</Text>
                          </View>
                        )}
                        <Text style={s.username}>{item.requested_by_username ?? 'Unknown'}</Text>
                      </View>
                      <Text style={s.label}>Requested removal</Text>
                      {!!item.reason && <Text style={s.reason}>"{item.reason}"</Text>}
                    </View>
                  </View>

                  <View style={s.voteRow}>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                    </View>
                    <Text style={s.voteLabel}>{item.yes_votes} of {item.member_count} voted yes</Text>
                  </View>

                  <View style={s.cardActions}>
                    {isOwner ? (
                      <Pressable style={({ pressed }) => [s.actionBtn, s.removeBtn, pressed && { opacity: 0.8 }]} onPress={() => handleOwnerDelete(item.photo_id)}>
                        <Text style={s.removeBtnText}>Remove Anyway</Text>
                      </Pressable>
                    ) : item.user_has_voted ? (
                      <Text style={s.votedLabel}>You've already voted</Text>
                    ) : (
                      <>
                        <Pressable style={({ pressed }) => [s.actionBtn, s.removeBtn, pressed && { opacity: 0.8 }]} onPress={() => handleVote(item.id, true)}>
                          <Text style={s.removeBtnText}>Remove Photo</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [s.actionBtn, s.dismissBtn, pressed && { opacity: 0.8 }]} onPress={() => handleVote(item.id, false)}>
                          <Text style={s.dismissBtnText}>Dismiss</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badge: { backgroundColor: '#FF6B6B', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  doneBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  doneBtnText: { fontSize: 16, color: '#FF6B6B', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  cardHighlighted: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#FF6B6B' },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  photo: { width: 80, height: 80, borderRadius: 10 },
  photoPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  photoDeleteBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4, justifyContent: 'center' },
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  username: { fontSize: 14, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, color: '#9ca3af' },
  reason: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  voteRow: { marginBottom: 10, gap: 4 },
  progressTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#FF3B30', borderRadius: 3 },
  voteLabel: { fontSize: 11, color: '#9ca3af' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  removeBtn: { backgroundColor: '#FF3B30' },
  removeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dismissBtn: { backgroundColor: '#f3f4f6' },
  dismissBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  votedLabel: { fontSize: 13, color: '#9ca3af', flex: 1, textAlign: 'center' },
});
