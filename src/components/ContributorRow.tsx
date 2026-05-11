import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { promoteToAdmin, demoteToMember, removeMember } from '../lib/galleries';
import type { Member } from './ContributorsModal';

type Props = {
  member: Member;
  galleryId: string;
  isOwner: boolean;
  currentUserId: string | undefined;
  onNavigate: () => void;
  onRefetch: () => void;
};

export function ContributorRow({ member, galleryId, isOwner, currentUserId, onNavigate, onRefetch }: Props) {
  const isCurrentUser = member.user_id === currentUserId;
  const isOwnerRole = member.role === 'owner';
  const isAdminRole = member.role === 'admin';
  const isPending = member.status === 'pending';
  const name = member.display_name || member.username || 'unknown';

  const handlePromote = async () => {
    try {
      await promoteToAdmin(galleryId, member.user_id);
      onRefetch();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not promote member.');
    }
  };

  const handleDemote = async () => {
    try {
      await demoteToMember(galleryId, member.user_id);
      onRefetch();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not demote member.');
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove member',
      `Remove ${name} from gallery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(galleryId, member.user_id);
              onRefetch();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not remove member.');
            }
          },
        },
      ],
    );
  };

  return (
    <Pressable
      style={[styles.row, isPending && { opacity: 0.5 }]}
      onPress={onNavigate}
    >
      {member.avatar_url ? (
        <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>
            {(member.username ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>{name}</Text>
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          )}
          {isOwnerRole && <Text style={styles.roleLabel}>(Owner)</Text>}
          {isAdminRole && <Text style={styles.roleLabel}>(Admin)</Text>}
          {isCurrentUser && <Text style={styles.roleLabel}>(You)</Text>}
        </View>
      </View>
      {isOwner && !isOwnerRole && (
        <View style={styles.actions}>
          {isAdminRole ? (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.demoteBtn, pressed && { opacity: 0.7 }]}
              onPress={handleDemote}
            >
              <Text style={styles.demoteBtnText}>Demote</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionBtn, styles.makeAdminBtn, isPending && styles.actionBtnDisabled]}
              onPress={isPending ? undefined : handlePromote}
              disabled={isPending}
            >
              <Text style={styles.makeAdminBtnText}>Make Admin</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.removeBtn, pressed && { opacity: 0.7 }]}
            onPress={handleRemove}
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },
  roleLabel: { fontSize: 12, color: '#9CA3AF' },
  pendingBadge: { borderRadius: 10, backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2 },
  pendingBadgeText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderWidth: 1.5,
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  makeAdminBtn: { borderColor: '#F5A623' },
  makeAdminBtnText: { fontSize: 13, fontWeight: '600', color: '#F5A623' },
  demoteBtn: { borderColor: '#FF3B30' },
  demoteBtnText: { fontSize: 13, fontWeight: '600', color: '#FF3B30' },
  removeBtn: { borderColor: '#FF3B30' },
  removeBtnText: { fontSize: 13, fontWeight: '600', color: '#FF3B30' },
});
