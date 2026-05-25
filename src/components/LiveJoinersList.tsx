import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../lib/supabase';

type MemberRow = {
  user_id: string;
  status: 'accepted' | 'pending';
  role: 'owner' | 'admin' | 'member';
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  galleryId: string | null;
  currentUserId: string;
  isOwner: boolean;
  /** Called after a successful remove. Parent may re-render or refresh suggestions. */
  onMemberRemoved?: (userId: string) => void;
};

export default function LiveJoinersList({ galleryId, currentUserId, isOwner, onMemberRemoved }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Partial<MemberRow>> => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    return {
      display_name: data?.display_name ?? null,
      username: data?.username ?? null,
      avatar_url: data?.avatar_url ?? null,
    };
  }, []);

  const loadAll = useCallback(async () => {
    if (!galleryId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberRows, error: memberErr } = await supabase
      .from('gallery_members')
      .select('user_id, status, role')
      .eq('gallery_id', galleryId);
    if (memberErr || !memberRows) {
      setMembers([]);
      setLoading(false);
      return;
    }
    if (memberRows.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const userIds = memberRows.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);
    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));
    const enriched: MemberRow[] = memberRows.map((r: any) => ({
      user_id: r.user_id,
      status: r.status,
      role: r.role,
      display_name: profileMap.get(r.user_id)?.display_name ?? null,
      username: profileMap.get(r.user_id)?.username ?? null,
      avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
    }));
    setMembers(enriched);
    setLoading(false);
  }, [galleryId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime subscription
  useEffect(() => {
    if (!galleryId) return;

    // Tear down any previous channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`gallery_members:${galleryId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gallery_members', filter: `gallery_id=eq.${galleryId}` },
        async (payload) => {
          const row = payload.new as any;
          const profile = await fetchProfile(row.user_id);
          setMembers((prev) => {
            if (prev.some((m) => m.user_id === row.user_id)) return prev;
            return [...prev, { user_id: row.user_id, status: row.status, role: row.role, ...profile } as MemberRow];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gallery_members', filter: `gallery_id=eq.${galleryId}` },
        (payload) => {
          const row = payload.new as any;
          setMembers((prev) =>
            prev.map((m) => (m.user_id === row.user_id ? { ...m, status: row.status, role: row.role } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'gallery_members', filter: `gallery_id=eq.${galleryId}` },
        (payload) => {
          const row = payload.old as any;
          setMembers((prev) => prev.filter((m) => m.user_id !== row.user_id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [galleryId, fetchProfile]);

  const handleRemove = useCallback(
    (member: MemberRow) => {
      if (!isOwner) return;
      if (member.user_id === currentUserId) return; // never remove self
      if (member.role === 'owner') return; // never remove the owner row
      Alert.alert(
        'Remove from gallery?',
        `${member.display_name || 'This person'} will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('gallery_members')
                .delete()
                .eq('gallery_id', galleryId!)
                .eq('user_id', member.user_id);
              if (error) {
                Alert.alert('Could not remove', error.message);
                return;
              }
              // Realtime DELETE handler will update local state, but update immediately for snappiness.
              setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
              onMemberRemoved?.(member.user_id);
            },
          },
        ]
      );
    },
    [galleryId, isOwner, currentUserId, onMemberRemoved]
  );

  if (!galleryId) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {loading ? 'Loading members…' : `${members.length} ${members.length === 1 ? 'person' : 'people'}`}
      </Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const isSelf = item.user_id === currentUserId;
          const isOwnerRow = item.role === 'owner';
          const canRemove = isOwner && !isSelf && !isOwnerRow;
          return (
            <View style={styles.row}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {(item.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.nameWrap}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.display_name || 'User'}
                  {isSelf ? ' (You)' : ''}
                </Text>
              </View>
              <View style={[styles.badge, item.status === 'pending' ? styles.badgePending : styles.badgeJoined]}>
                <Text style={[styles.badgeText, item.status === 'pending' ? styles.badgeTextPending : styles.badgeTextJoined]}>
                  {isOwnerRow ? 'Owner' : item.status === 'pending' ? 'Pending' : 'Joined'}
                </Text>
              </View>
              {canRemove && (
                <Pressable onPress={() => handleRemove(item)} hitSlop={12} style={styles.removeBtn}>
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No one has joined yet. Share the QR or link to invite friends.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12 },
  header: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { fontWeight: '700', color: '#9CA3AF' },
  nameWrap: { flex: 1 },
  displayName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeJoined: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextJoined: { color: '#15803D' },
  badgeTextPending: { color: '#B45309' },
  removeBtn: { padding: 4 },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  empty: { fontSize: 14, color: '#9CA3AF', paddingVertical: 12, textAlign: 'center' },
});
