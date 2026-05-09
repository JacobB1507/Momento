import React from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  mutuals: any[];
  currentUserId: string;
  onFriendRequestSent: () => void;
};

export default function MutualFriendsModal({ visible, onClose, mutuals }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.title}>Mutual Friends</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <FlatList
          data={mutuals}
          keyExtractor={item => item.id}
          contentContainerStyle={mutuals.length === 0 ? styles.emptyContainer : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>No mutual friends</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarLetter}>
                    {(item.username ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.display_name || item.username || 'Unknown'}
                </Text>
                <Text style={styles.handle}>@{item.username ?? 'unknown'}</Text>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerPlaceholder: { width: 28 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 4 },
  closeIcon: { fontSize: 18, color: '#6B7280' },
  list: { paddingBottom: 32 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, color: '#9CA3AF' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  handle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
});
