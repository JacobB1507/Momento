import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchConversations, fetchMessageRequests, respondToMessageRequest, clearConversationForUser, setConversationPinned } from '../lib/messages';
import ConversationRow from '../components/ConversationRow';
import { SkeletonCircle, SkeletonText } from '../components/Skeleton';

export default function MessagesScreen() {
  const { session } = useAuth();
  const user = session?.user;
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [data, requests, sentRes] = await Promise.all([
        fetchConversations(user.id),
        fetchMessageRequests(user.id),
        supabase.from('message_requests').select('target_user_id').eq('requester_id', user.id).eq('status', 'pending'),
      ]);
      const pendingReceivedUserIds = new Set(
        (requests ?? [])
          .filter((r: any) => r.status === 'pending')
          .map((r: any) => r.requester_id)
      );
      const visibleConversations = (data ?? []).filter((c: any) => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        return !pendingReceivedUserIds.has(otherId);
      });
      setConversations(visibleConversations);
      setMessageRequests(requests ?? []);
      setPendingSentIds(new Set((sentRes.data ?? []).map((r: any) => r.target_user_id)));
    } catch (e) {
      console.error('fetchConversations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAccept = async (r: any) => {
    const convo = await respondToMessageRequest(r.id, true, r.requester_id, user!.id);
    if (convo) setConversations(prev => [convo, ...prev]);
    setMessageRequests(prev => prev.filter(x => x.id !== r.id));
  };

  const handleDecline = async (r: any) => {
    await respondToMessageRequest(r.id, false, r.requester_id, user!.id);
    setMessageRequests(prev => prev.filter(x => x.id !== r.id));
  };

  const handleRequestTap = async (r: any) => {
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${r.requester_id},participant_2.eq.${user!.id}),and(participant_1.eq.${user!.id},participant_2.eq.${r.requester_id})`)
      .maybeSingle();
    if (!convo) return;
    const profile = r.profile ?? {};
    const name = profile.display_name || profile.username || '';
    navigation.navigate('Chat', { conversationId: convo.id, otherUserId: r.requester_id, otherUsername: name, isPendingRequest: true });
  };

  const sortConvos = (convos: any[]) => [...convos].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    if (a.is_pinned && b.is_pinned) {
      return new Date(b.pinned_at ?? 0).getTime() - new Date(a.pinned_at ?? 0).getTime();
    }
    return new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime();
  });

  const handlePin = async (conversation: any) => {
    const newPinned = !conversation.is_pinned;
    const now = new Date().toISOString();
    setConversations(prev => sortConvos(prev.map(c =>
      c.id === conversation.id ? { ...c, is_pinned: newPinned, pinned_at: newPinned ? now : null } : c
    )));
    try {
      await setConversationPinned(conversation.id, newPinned);
    } catch {
      setConversations(prev => sortConvos(prev.map(c => c.id === conversation.id ? conversation : c)));
      Alert.alert('Error', 'Could not update pin. Please try again.');
    }
  };

  const handleClearConversation = (conversation: any) => {
    const otherUsername = conversation.otherUsername ?? 'this conversation';
    Alert.alert(
      'Clear Conversation',
      `Clear your conversation with ${otherUsername}? Your sent messages will be removed from your view.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearConversationForUser(conversation.id, user!.id);
            setConversations(prev => prev.filter(c => c.id !== conversation.id));
          },
        },
      ]
    );
  };

  const filteredConversations = conversations
    .filter(item => (item.otherUsername ?? '').toLowerCase().includes(searchQuery.toLowerCase()));

  const RequestsHeader = messageRequests.length > 0 ? (
    <View>
      <Pressable onPress={() => setRequestsExpanded(e => !e)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff5f5' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="mail-unread-outline" size={22} color="#FF6B6B" />
          <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>Message Requests</Text>
          <View style={{ backgroundColor: '#FF6B6B', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{messageRequests.length}</Text>
          </View>
        </View>
        <Ionicons name={requestsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
      </Pressable>
      {requestsExpanded && messageRequests.map(r => {
        const profile = r.profile ?? {};
        const name = profile.display_name || profile.username || 'Unknown';
        const avatar = profile.avatar_url;
        return (
          <Pressable key={r.id} onPress={() => handleRequestTap(r)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 }}>
            {avatar
              ? <Image source={{ uri: avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#9ca3af' }}>{name[0]?.toUpperCase()}</Text>
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{name}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }} numberOfLines={2}>{r.message_preview ?? 'Wants to message you'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => handleAccept(r)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={20} color="#10b981" />
              </Pressable>
              <Pressable onPress={() => handleDecline(r)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color="#ef4444" />
              </Pressable>
            </View>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
              }}
            >
              <SkeletonCircle size={48} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <SkeletonText width="40%" height={15} />
                  <SkeletonText width={40} height={11} />
                </View>
                <SkeletonText width="75%" height={13} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewMessage')} style={styles.composeBtn}>
          <Ionicons name="create-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        alwaysBounceVertical={true}
        contentContainerStyle={{ flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            {RequestsHeader}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const otherId = item.participant_1 === user?.id ? item.participant_2 : item.participant_1;
          const isPendingSent = pendingSentIds.has(otherId);
          return (
            <Swipeable
              renderRightActions={() => (
                <Pressable
                  style={{ backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 80 }}
                  onPress={() => handleClearConversation(item)}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>Delete</Text>
                </Pressable>
              )}
            >
              <ConversationRow
                conversation={item}
                currentUserId={user!.id}
                customPreview={isPendingSent ? 'Waiting for them to accept your message request...' : undefined}
                isPinned={item.is_pinned}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id, otherUserId: otherId, otherUsername: item.otherUsername ?? '' })}
                onLongPress={() => {
                  Alert.alert(
                    item.otherUsername ?? 'Conversation',
                    undefined,
                    [
                      { text: item.is_pinned ? 'Unpin Conversation' : 'Pin Conversation', onPress: () => handlePin(item) },
                      { text: 'Clear', style: 'destructive', onPress: () => handleClearConversation(item) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              />
            </Swipeable>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Start a conversation with a friend</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  composeBtn: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#9ca3af' },
});
