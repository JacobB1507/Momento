import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { fetchConversations } from '../lib/messages';
import ConversationRow from '../components/ConversationRow';

export default function MessagesScreen() {
  const { session } = useAuth();
  const user = session?.user;
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchConversations(user.id);
      setConversations(data ?? []);
    } catch (e) {
      console.error('fetchConversations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

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

  const filteredConversations = conversations.filter(item =>
    (item.otherUsername ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FF6B6B" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewMessage')} style={styles.composeBtn}>
          <Ionicons name="create-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
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
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        alwaysBounceVertical={true}
        contentContainerStyle={{ flexGrow: 1 }}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            currentUserId={user!.id}
            onPress={() => {
              const otherUserId = item.participant_1 === user!.id ? item.participant_2 : item.participant_1;
              navigation.navigate('Chat', { conversationId: item.id, otherUserId, otherUsername: item.otherUsername ?? '' });
            }}
          />
        )}
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
