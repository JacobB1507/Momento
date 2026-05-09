import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getFriends } from '../lib/friends';
import { getTrustedFriends, addTrustedFriend, removeTrustedFriend } from '../lib/trustedFriends';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Profile = { id: string; username: string | null; display_name?: string | null; avatar_url: string | null };

const AVATAR = 40;
const MODAL_AVATAR = 44;

function AvatarThumb({ uri, username, size }: { uri: string | null; username: string | null; size: number }) {
  const letter = (username ?? '?').charAt(0).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.4 }]}>{letter}</Text>
    </View>
  );
}

export default function TrustedFriendsScreen() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [trustedIds, setTrustedIds] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Profile[]>([]);
  const [trustedProfiles, setTrustedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalRefreshing, setModalRefreshing] = useState(false);

  const loadData = async () => {
    if (!userId) return;
    const [friendProfiles, trustedRows] = await Promise.all([
      getFriends(userId) as Promise<Profile[]>,
      getTrustedFriends(supabase),
    ]);
    const tIds = new Set<string>((trustedRows as any[]).map((r: any) => r.trusted_user_id as string));
    const tProfiles: Profile[] = (trustedRows as any[]).map((r: any) => ({
      id: r.profiles.id,
      username: r.profiles.username,
      display_name: r.profiles.display_name,
      avatar_url: r.profiles.avatar_url,
    }));
    setTrustedIds(tIds);
    setTrustedProfiles(tProfiles);
    setFriends(friendProfiles);
  };

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setLoading(false));
    }, [userId]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleModalRefresh = async () => {
    setModalRefreshing(true);
    await loadData();
    setModalRefreshing(false);
  };

  const handleRemove = async (profileId: string) => {
    setTrustedIds(prev => { const s = new Set(prev); s.delete(profileId); return s; });
    setTrustedProfiles(prev => prev.filter(p => p.id !== profileId));
    await removeTrustedFriend(supabase, profileId);
  };

  const handleModalAdd = async (profile: Profile) => {
    const newTrustedIds = new Set([...trustedIds, profile.id]);
    setTrustedIds(newTrustedIds);
    setTrustedProfiles(prev => [...prev, profile]);
    await addTrustedFriend(supabase, profile.id);
    const remaining = friends.filter(f => !newTrustedIds.has(f.id));
    if (remaining.length === 0) setShowModal(false);
  };

  const untrustedFriends = friends.filter(f => !trustedIds.has(f.id));

  const filteredUntrusted = modalSearch.trim()
    ? untrustedFriends.filter(f => {
        const q = modalSearch.toLowerCase();
        return (f.display_name ?? '').toLowerCase().includes(q) || (f.username ?? '').toLowerCase().includes(q);
      })
    : untrustedFriends;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Trusted Friends</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}><ActivityIndicator color="#FF6B6B" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Trusted Friends</Text>
        <Pressable onPress={() => { setModalSearch(''); setShowModal(true); }} style={styles.headerRight} hitSlop={12}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B6B" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>If a trusted friend invites you to a gallery, you automatically join without needing to accept.</Text>

        <Text style={styles.sectionLabel}>Trusted</Text>
        <View style={styles.card}>
          {trustedProfiles.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No trusted friends yet. Tap + Add to get started.</Text>
            </View>
          ) : (
            trustedProfiles.map((profile, index) => (
              <View key={profile.id}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.row}>
                  <AvatarThumb uri={profile.avatar_url} username={profile.username} size={AVATAR} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {profile.display_name || profile.username || 'unknown'}
                    </Text>
                    {profile.username ? <Text style={styles.rowUsername}>@{profile.username}</Text> : null}
                  </View>
                  <Pressable onPress={() => handleRemove(profile.id)} hitSlop={10}>
                    <Ionicons name="star" size={22} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Trusted Friend Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowModal(false)} style={styles.modalClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>Add Trusted Friend</Text>
            <View style={styles.modalClose} />
          </View>

          <View style={styles.modalSearchWrap}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search friends..."
              placeholderTextColor="#9CA3AF"
              value={modalSearch}
              onChangeText={setModalSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredUntrusted}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={modalRefreshing} onRefresh={handleModalRefresh} tintColor="#FF6B6B" />}
            contentContainerStyle={filteredUntrusted.length === 0 ? styles.modalEmptyContainer : styles.modalList}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>All your friends are already trusted.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.modalRow}>
                <AvatarThumb uri={item.avatar_url} username={item.username} size={MODAL_AVATAR} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.display_name || item.username || 'unknown'}
                  </Text>
                  {item.username ? <Text style={styles.rowUsername}>@{item.username}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleModalAdd(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: { paddingVertical: 6, minWidth: 60 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerRight: { minWidth: 60, alignItems: 'flex-end' },
  addButtonText: { fontSize: 15, color: '#FF6B6B', fontWeight: '600' },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#9CA3AF', lineHeight: 19, marginBottom: 20 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyRow: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowUsername: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },

  avatarPlaceholder: { backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '700' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  modalClose: { width: 36, alignItems: 'center' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },

  modalSearchWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalSearchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },

  modalList: { paddingTop: 8, paddingBottom: 40 },
  modalEmptyContainer: { flex: 1 },
  modalEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  modalEmptyText: { fontSize: 15, color: '#9CA3AF' },

  modalSeparator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 74 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
  },

  addBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
