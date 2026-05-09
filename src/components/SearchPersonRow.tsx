import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { sendFriendRequest } from '../lib/friends';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type FriendStatus = 'none' | 'pending' | 'friends';

type Props = {
  user: { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio: string | null };
  currentUserId: string;
  onPress?: () => void;
};

const AVATAR = 40;
const COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function SearchPersonRow({ user, currentUserId, onPress }: Props) {
  const navigation = useNavigation<NavProp>();
  const [status, setStatus] = useState<FriendStatus>('none');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('friends')
        .select('id, status')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`
        )
        .in('status', ['accepted', 'pending'])
        .limit(1)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            setStatus('none');
            return;
          }
          const row = data[0];
          setStatus(row.status === 'accepted' ? 'friends' : 'pending');
        });
    }, [user.id, currentUserId])
  );

  const handleAddFriend = async () => {
    if (!user.username) return;
    setLoading(true);
    const result = await sendFriendRequest(currentUserId, user.username);
    if (result === 'sent') setStatus('pending');
    else if (result === 'already_friends') setStatus('friends');
    setLoading(false);
  };

  const letter = (user.username ?? '?').charAt(0).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F9FAFB' }]}
      onPress={() => {
        onPress?.();
        navigation.navigate('FriendProfile', {
          userId: user.id,
          username: user.username ?? 'unknown',
        });
      }}
    >
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor(user.id) }]}>
          <Text style={styles.avatarLetter}>{letter}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username}>{user.display_name || user.username || 'unknown'}</Text>
        <Text style={styles.handle}>@{user.username ?? 'unknown'}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          status === 'friends' && styles.addButtonFriends,
          status === 'pending' && styles.addButtonPending,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleAddFriend}
        disabled={status !== 'none' || loading}
      >
        <Text style={[
          styles.addButtonText,
          status === 'friends' && styles.addButtonTextAlt,
          status === 'pending' && styles.addButtonTextAlt,
        ]}>
          {status === 'friends' ? 'Friends' : status === 'pending' ? 'Pending' : loading ? '…' : 'Add Friend'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  username: { fontSize: 15, fontWeight: '700', color: '#111827' },
  handle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  addButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addButtonFriends: { backgroundColor: '#D1FAE5' },
  addButtonPending: { backgroundColor: '#F3F4F6' },
  addButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  addButtonTextAlt: { color: '#6B7280' },
});
