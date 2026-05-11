import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export type TransferMember = {
  user_id: string;
  role: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  galleryId: string;
  currentUserId: string;
  onSelect: (member: TransferMember) => void;
};

export function TransferSelectStage({ galleryId, currentUserId, onSelect }: Props) {
  const [members, setMembers] = useState<TransferMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: memberRows } = await supabase
        .from('gallery_members')
        .select('user_id, role')
        .eq('gallery_id', galleryId)
        .eq('status', 'accepted')
        .neq('user_id', currentUserId);

      const userIds = (memberRows ?? []).map((m: any) => m.user_id);
      let merged: TransferMember[] = [];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        merged = (memberRows ?? []).map((m: any) => {
          const p = (profiles ?? []).find((pr: any) => pr.id === m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            username: p?.username ?? null,
            display_name: p?.display_name ?? null,
            avatar_url: p?.avatar_url ?? null,
          };
        });
      }

      if (!cancelled) {
        setMembers(merged);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [galleryId, currentUserId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FF6B6B" size="large" />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No other members in this gallery. Invite people first before transferring ownership.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select new owner</Text>
      <FlatList
        data={members}
        keyExtractor={item => item.user_id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const name = item.display_name || item.username || 'Unknown';
          const initial = (item.username ?? '?').charAt(0).toUpperCase();
          return (
            <View style={styles.row}>
              {item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                : <View style={styles.avatarPlaceholder}><Text style={styles.avatarLetter}>{initial}</Text></View>}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                {item.role === 'admin' && <Text style={styles.adminLabel}>(Admin)</Text>}
              </View>
              <Pressable
                style={({ pressed }) => [styles.selectBtn, pressed && { opacity: 0.7 }]}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.selectBtnText}>Transfer ownership</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16, paddingHorizontal: 24 },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 15, fontWeight: '700' },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '500', color: '#111827', flexShrink: 1 },
  adminLabel: { fontSize: 12, color: '#9CA3AF' },
  selectBtn: { borderWidth: 1.5, borderColor: '#FF3B30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  selectBtnText: { fontSize: 12, fontWeight: '600', color: '#FF3B30' },
});
