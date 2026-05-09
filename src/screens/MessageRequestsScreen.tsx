import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchMessageRequests, respondToMessageRequest } from '../lib/messages';
import { getMutualFriends } from '../lib/friends';
import MutualFriendsModal from '../components/MutualFriendsModal';

function MutualCount({ requesterId, currentUserId }: { requesterId: string; currentUserId: string }) {
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getMutualFriends(currentUserId, requesterId).then(setMutuals).catch(() => {});
  }, [currentUserId, requesterId]);

  if (mutuals.length === 0) return null;
  return (
    <>
      <Pressable onPress={() => setShowModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
        {mutuals.slice(0, 3).map(m => (
          m.avatar_url
            ? <Image key={m.id} source={{ uri: m.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9 }} />
            : <View key={m.id} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#9ca3af' }}>{(m.username ?? '?')[0].toUpperCase()}</Text>
              </View>
        ))}
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          {mutuals.length} mutual friend{mutuals.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>
      <MutualFriendsModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        mutuals={mutuals}
        currentUserId={currentUserId}
        onFriendRequestSent={() => {}}
      />
    </>
  );
}

export default function MessageRequestsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await fetchMessageRequests(currentUserId);
    setRequests(data);
  };

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [currentUserId]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAccept = async (req: any) => {
    const convo = await respondToMessageRequest(req.id, true, req.requester_id, currentUserId);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    if (convo) {
      navigation.navigate('Chat', {
        conversationId: convo.id,
        otherUserId: req.requester_id,
        otherUsername: req.profile?.display_name || req.profile?.username || '',
      });
    }
  };

  const handleDecline = async (req: any) => {
    await respondToMessageRequest(req.id, false, req.requester_id, currentUserId);
    setRequests(prev => prev.filter(r => r.id !== req.id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Message Requests</Text>
        <View style={styles.backPlaceholder} />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#FF6B6B" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No message requests</Text>}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.profile?.avatar_url ? (
                <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarLetter}>
                    {(item.profile?.username ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.profile?.display_name || item.profile?.username || 'Unknown'}
                </Text>
                {!!item.message_preview && (
                  <Text style={styles.preview} numberOfLines={1}>{item.message_preview}</Text>
                )}
                <MutualCount requesterId={item.requester_id} currentUserId={currentUserId} />
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.acceptBtn} onPress={() => handleAccept(item)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.declineBtn} onPress={() => handleDecline(item)}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  back: { fontSize: 32, color: '#FF6B6B', fontWeight: '300', lineHeight: 36 },
  backPlaceholder: { width: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  list: { paddingBottom: 32 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, color: '#9CA3AF' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  preview: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: '#34C759', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  declineBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  declineText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
});
