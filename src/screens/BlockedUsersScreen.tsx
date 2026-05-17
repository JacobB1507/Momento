import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fetchBlockedUsers, unblockUser } from '../lib/blocks';

type BlockedUser = {
  block_id: string;
  blocked_id: string;
  blocked_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchBlockedUsers();
    setBlocked(data as BlockedUser[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleUnblock = (item: BlockedUser) => {
    const name = item.display_name || item.username || 'this user';
    Alert.alert(
      `Unblock ${name}?`,
      'They will be able to see your profile and interact with you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            const { error } = await unblockUser(item.blocked_id);
            if (error) {
              Alert.alert('Could not unblock', 'Please try again.');
              return;
            }
            load();
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const name = item.display_name || item.username || 'Unknown';
    const letter = name.charAt(0).toUpperCase();
    return (
      <View style={styles.row}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{letter}</Text>
          </View>
        )}
        <View style={styles.nameCol}>
          <Text style={styles.name}>{name}</Text>
          {item.username && item.display_name ? (
            <Text style={styles.username}>@{item.username}</Text>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [styles.unblockBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleUnblock(item)}
        >
          <Text style={styles.unblockText}>Unblock</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Blocked Users</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={item => item.block_id}
          renderItem={renderItem}
          contentContainerStyle={blocked.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: '#6B7280' },
  nameCol: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  username: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  unblockText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
