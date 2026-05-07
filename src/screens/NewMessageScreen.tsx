import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createConversation } from '../lib/messages';

type Friend = { id: string; username: string | null; avatar_url: string | null };
type Request = { id: string; requester_id: string; username: string | null; avatar_url: string | null };

export default function NewMessageScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const user = session?.user;
  const currentUserId = user?.id ?? '';

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFriendId, setLoadingFriendId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      const ids = (rows ?? []).map((r: any) =>
        r.sender_id === currentUserId ? r.receiver_id : r.sender_id
      );

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, username, avatar_url').in('id', ids);
        setFriends(profiles ?? []);
      }

      const { data: reqs } = await supabase
        .from('message_requests')
        .select('id, requester_id')
        .eq('target_user_id', currentUserId)
        .eq('status', 'pending');

      if ((reqs ?? []).length > 0) {
        const reqIds = (reqs ?? []).map((r: any) => r.requester_id);
        const { data: reqProfiles } = await supabase
          .from('profiles').select('id, username, avatar_url').in('id', reqIds);
        setRequests((reqs ?? []).map((r: any) => ({
          id: r.id,
          requester_id: r.requester_id,
          username: reqProfiles?.find((p: any) => p.id === r.requester_id)?.username ?? null,
          avatar_url: reqProfiles?.find((p: any) => p.id === r.requester_id)?.avatar_url ?? null,
        })));
      }
      setLoading(false);
    };
    load();
  }, [currentUserId]);

  const handleSelect = async (friend: Friend) => {
    if (!user?.id) return;
    setLoadingFriendId(friend.id);
    try {
      const convo = await createConversation(user.id, friend.id);
      navigation.replace('Chat', {
        conversationId: convo.id,
        otherUserId: friend.id,
        otherUsername: friend.username ?? 'User',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    } finally {
      setLoadingFriendId(null);
    }
  };

  const filtered = friends.filter(f =>
    !query || (f.username ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => handleSelect(item)}
      disabled={loadingFriendId !== null}
    >
      {item.avatar_url
        ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        : <View style={styles.avatarPlaceholder}><Text style={styles.avatarLetter}>{(item.username ?? '?').charAt(0).toUpperCase()}</Text></View>}
      <Text style={[styles.username, { flex: 1 }]}>@{item.username ?? 'unknown'}</Text>
      {loadingFriendId === item.id && <ActivityIndicator size="small" color="#FF6B6B" />}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>New Message</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.close}>✕</Text></Pressable>
      </View>
      <TextInput style={styles.search} placeholder="Search friends..." placeholderTextColor="#9CA3AF"
        value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#FF6B6B" /> : (
        <FlatList
          data={filtered}
          keyExtractor={f => f.id}
          renderItem={renderFriend}
          ListEmptyComponent={<Text style={styles.empty}>No friends found</Text>}
          ListFooterComponent={requests.length > 0 ? (
            <View>
              <Text style={styles.sectionLabel}>Message Requests</Text>
              {requests.map(r => (
                <View key={r.id} style={styles.row}>
                  {r.avatar_url
                    ? <Image source={{ uri: r.avatar_url }} style={styles.avatar} />
                    : <View style={styles.avatarPlaceholder}><Text style={styles.avatarLetter}>{(r.username ?? '?').charAt(0).toUpperCase()}</Text></View>}
                  <Text style={[styles.username, { flex: 1 }]}>@{r.username ?? 'unknown'}</Text>
                  <Pressable style={styles.acceptBtn} onPress={() => supabase.from('message_requests').update({ status: 'accepted' }).eq('id', r.id).then(() => setRequests(prev => prev.filter(x => x.id !== r.id)))}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </Pressable>
                  <Pressable style={styles.declineBtn} onPress={() => supabase.from('message_requests').update({ status: 'declined' }).eq('id', r.id).then(() => setRequests(prev => prev.filter(x => x.id !== r.id)))}>
                    <Text style={styles.declineText}>Decline</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  close: { fontSize: 18, color: '#9CA3AF' },
  search: { margin: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  username: { fontSize: 15, fontWeight: '600', color: '#111827' },
  empty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  acceptBtn: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  declineBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  declineText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
});
