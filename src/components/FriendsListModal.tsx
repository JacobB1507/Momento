import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getFriends } from '../lib/friends';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Friend = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
};

const AVATAR = 40;

export function FriendsListModal({ visible, onClose, userId }: Props) {
  const navigation = useNavigation<NavProp>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) return;
    getFriends(userId).then(data => setFriends((data as Friend[]).filter(Boolean)));
  }, [visible, userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f =>
      (f.display_name ?? '').toLowerCase().includes(q) ||
      (f.username ?? '').toLowerCase().includes(q)
    );
  }, [friends, search]);

  const handleRowPress = (friend: Friend) => {
    onClose();
    navigation.navigate('FriendProfile', {
      userId: friend.id,
      username: friend.username ?? 'unknown',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No friends yet</Text>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F3F4F6' }]}
              onPress={() => handleRowPress(item)}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {(item.username ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.username} numberOfLines={1}>
                {item.display_name || item.username || 'unknown'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  closeButton: { padding: 4 },
  closeIcon: { fontSize: 18, color: '#6B7280' },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },

  list: { paddingBottom: 32 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingTop: 48,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  username: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  chevron: { fontSize: 22, color: '#9CA3AF', lineHeight: 26 },
});
