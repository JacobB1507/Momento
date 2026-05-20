import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { syncContacts, type MatchedContact, type UnmatchedContact, type ContactSyncResult } from '../lib/contacts';
import { sendFriendRequestById, createInviteLink } from '../lib/friends';

type Props = {
  currentUserId: string;
  friendIds: string[];
  pendingRequestIds: string[];
  refreshKey: number;
  onFriendRequestSent?: (userId: string) => void;
  onPress: (userId: string) => void;
};

export default function ContactsOnMomentoSection({ currentUserId, friendIds, pendingRequestIds, refreshKey, onFriendRequestSent, onPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<ContactSyncResult | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [requestingUserIds, setRequestingUserIds] = useState(new Set<string>());
  const [invitingPhones, setInvitingPhones] = useState(new Set<string>());

  useEffect(() => {
    (createInviteLink as (id: string) => Promise<string | null>)(currentUserId)
      .then(link => setInviteLink(link ?? ''));
  }, [currentUserId]);

  useEffect(() => {
    setLoading(true);
    syncContacts().then(result => { setSyncResult(result); setLoading(false); });
  }, [refreshKey]);

  const handleAdd = async (matched: MatchedContact) => {
    setRequestingUserIds(prev => new Set(prev).add(matched.id));
    try {
      const result = await sendFriendRequestById(currentUserId, matched.id);
      if (result === 'sent' || result === 'already_friends') {
        onFriendRequestSent?.(matched.id);
      } else {
        Alert.alert('Error', 'Could not send friend request. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not send friend request. Please try again.');
    } finally {
      setRequestingUserIds(prev => { const s = new Set(prev); s.delete(matched.id); return s; });
    }
  };

  const handleInvite = async (phone: string) => {
    if (invitingPhones.has(phone) || !inviteLink) return;
    setInvitingPhones(prev => new Set(prev).add(phone));
    const body = encodeURIComponent(`Hey, I'm using Momento — join me: ${inviteLink}`);
    const url = Platform.OS === 'ios' ? `sms:${phone}&body=${body}` : `sms:${phone}?body=${body}`;
    try { await Linking.openURL(url); } catch {}
    setTimeout(() => setInvitingPhones(prev => { const s = new Set(prev); s.delete(phone); return s; }), 1000);
  };

  if (loading) return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>CONTACTS ON MOMENTO</Text>
      <ActivityIndicator size="small" color="#FF6B6B" style={{ marginTop: 8 }} />
    </View>
  );
  if (!syncResult) return null;
  if (!syncResult.permissionGranted) return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>CONTACTS ON MOMENTO</Text>
      <Text style={styles.permissionText}>Enable contacts in Settings to find your friends.</Text>
    </View>
  );

  const filteredMatched = syncResult.matched
    .filter(m => !friendIds.includes(m.id))
    .sort((a, b) => (a.display_name || a.contactName).localeCompare(b.display_name || b.contactName));
  const sortedUnmatched = [...syncResult.unmatched].sort((a, b) => a.contactName.localeCompare(b.contactName));
  type Row = { type: 'matched'; item: MatchedContact } | { type: 'unmatched'; item: UnmatchedContact };
  const allRows: Row[] = [
    ...filteredMatched.map(item => ({ type: 'matched' as const, item })),
    ...sortedUnmatched.map(item => ({ type: 'unmatched' as const, item })),
  ];
  if (allRows.length === 0) return null;

  const visibleRows = expanded ? allRows : allRows.slice(0, 5);

  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeaderRow} onPress={() => setExpanded(v => !v)}>
        <Text style={styles.sectionHeader}>CONTACTS ON MOMENTO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.countText}>{allRows.length}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </View>
      </Pressable>
      <View style={styles.card}>
        {visibleRows.map((row, idx) => (
          <View key={row.type === 'matched' ? row.item.id : row.item.phoneE164}>
            {idx > 0 && <View style={styles.separator} />}
            <ContactRow
              row={row}
              isPending={row.type === 'matched' && pendingRequestIds.includes(row.item.id)}
              isRequesting={row.type === 'matched' && requestingUserIds.has(row.item.id)}
              canInvite={!!inviteLink}
              isInviting={row.type === 'unmatched' && invitingPhones.has(row.item.phoneE164)}
              onAdd={() => { if (row.type === 'matched') handleAdd(row.item); }}
              onInvite={() => { if (row.type === 'unmatched') handleInvite(row.item.phoneE164); }}
              onPress={() => { if (row.type === 'matched') onPress(row.item.id); }}
            />
          </View>
        ))}
      </View>
      {allRows.length > 5 && (
        <Pressable onPress={() => setExpanded(v => !v)} style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.toggleText}>{expanded ? 'Show less' : `Show all (${allRows.length})`}</Text>
        </Pressable>
      )}
    </View>
  );
}

type RowProps = {
  row: { type: 'matched'; item: MatchedContact } | { type: 'unmatched'; item: UnmatchedContact };
  isPending: boolean; isRequesting: boolean; canInvite: boolean; isInviting: boolean;
  onAdd: () => void; onInvite: () => void; onPress: () => void;
};

function ContactRow({ row, isPending, isRequesting, canInvite, isInviting, onAdd, onInvite, onPress }: RowProps) {
  const isMatched = row.type === 'matched';
  const name = isMatched ? (row.item.display_name || row.item.contactName) : row.item.contactName;
  const sub = isMatched ? `@${row.item.username}` : '';
  const avatarUrl = isMatched ? row.item.avatar_url : null;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && isMatched && { backgroundColor: '#F9FAFB' }]} onPress={isMatched ? onPress : undefined}>
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        : <View style={styles.avatarPlaceholder}><Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text></View>
      }
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {isMatched
        ? isPending
          ? <View style={styles.requestedPill}><Text style={styles.requestedText}>Requested</Text></View>
          : <Pressable style={({ pressed }) => [styles.addBtn, (isRequesting || pressed) && { opacity: 0.7 }]} onPress={onAdd} disabled={isRequesting}><Text style={styles.addText}>{isRequesting ? '…' : 'Add'}</Text></Pressable>
        : <Pressable style={({ pressed }) => [styles.inviteBtn, (!canInvite || isInviting || pressed) && { opacity: 0.6 }]} onPress={onInvite} disabled={!canInvite || isInviting}><Text style={styles.inviteText}>Invite</Text></Pressable>
      }
    </Pressable>
  );
}

const AVATAR = 36;
const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginHorizontal: 16 },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  countText: { fontSize: 13, color: '#9CA3AF' },
  permissionText: { fontSize: 14, color: '#9CA3AF', marginHorizontal: 16, marginTop: 4 },
  card: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 62 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#374151', fontSize: 14, fontWeight: '700' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  addBtn: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  requestedPill: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  requestedText: { color: '#9CA3AF', fontSize: 13 },
  inviteBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  inviteText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  toggleBtn: { marginTop: 8, marginLeft: 16 },
  toggleText: { fontSize: 14, color: '#FF6B6B', fontWeight: '500' },
});
