import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Friend = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  friend: Friend;
  mutualCount: number;
  isInvited: boolean;
  onInvite: () => void;
};

const COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function FriendInviteCard({ friend, mutualCount, isInvited, onInvite }: Props) {
  const letter = (friend.username ?? '?').charAt(0).toUpperCase();
  const displayName = friend.display_name || friend.username;
  const mutualLabel =
    mutualCount === 0 ? 'No mutuals' : mutualCount === 1 ? '1 mutual' : `${mutualCount} mutuals`;

  return (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {friend.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor(friend.id) }]}>
            <Text style={styles.avatarLetter}>{letter}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      <Text style={styles.mutuals}>{mutualLabel}</Text>
      <TouchableOpacity
        onPress={() => !isInvited && onInvite()}
        style={[styles.inviteBtn, isInvited && styles.inviteBtnInvited]}
        activeOpacity={isInvited ? 1 : 0.7}
        disabled={isInvited}
      >
        <Text style={[styles.inviteBtnText, isInvited && styles.inviteBtnTextInvited]}>
          {isInvited ? 'Invited ✓' : 'Invite'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
  },
  mutuals: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 10 },
  inviteBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 6,
    width: '100%',
    alignItems: 'center',
  },
  inviteBtnInvited: { backgroundColor: '#E5E7EB' },
  inviteBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  inviteBtnTextInvited: { color: '#6B7280' },
});
