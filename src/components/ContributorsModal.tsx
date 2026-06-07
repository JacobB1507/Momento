import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-qr-code';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { InviteViaSection } from './InviteViaSection';
import { searchUsers } from '../lib/search';
import { ContributorRow } from './ContributorRow';
import { SkeletonCircle, SkeletonText } from './Skeleton';

type Props = {
  visible: boolean;
  onClose: () => void;
  galleryId: string;
  isOwner: boolean;
  ownerId: string;
};

export type Member = {
  user_id: string;
  role?: string;
  status?: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type SearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function getOrCreateGalleryInviteCode(userId: string, galleryId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('invites')
    .select('code')
    .eq('sender_id', userId)
    .eq('gallery_id', galleryId)
    .maybeSingle();
  if (existing?.code) return existing.code;

  const code = Math.random().toString(36).substring(2, 10);
  await supabase.from('invites').insert({ sender_id: userId, code, gallery_id: galleryId });
  return code;
}

export function ContributorsModal({ visible, onClose, galleryId, isOwner, ownerId }: Props) {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const currentMember = members.find(m => m.user_id === session?.user.id);
  const canInvite = isOwner || currentMember?.role === 'admin';
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [addSuccess, setAddSuccess] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [memberStatusMap, setMemberStatusMap] = useState<Map<string, string>>(new Map());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const { data: memberRows } = await supabase
        .from('gallery_members')
        .select('user_id, role, status')
        .eq('gallery_id', galleryId);

      const rows = memberRows ?? [];
      const userIds = rows.map((m: any) => m.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : [ownerId]);

      const merged: Member[] = rows.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        username: profiles?.find((p: any) => p.id === m.user_id)?.username ?? 'Unknown',
        display_name: profiles?.find((p: any) => p.id === m.user_id)?.display_name ?? null,
        avatar_url: profiles?.find((p: any) => p.id === m.user_id)?.avatar_url ?? null,
      }));

      const ownerInList = merged.some(m => m.user_id === ownerId);
      if (!ownerInList && ownerId) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', ownerId)
          .maybeSingle();
        merged.unshift({
          user_id: ownerId,
          role: 'owner',
          status: 'accepted',
          username: ownerProfile?.username ?? 'Unknown',
          display_name: ownerProfile?.display_name ?? null,
          avatar_url: ownerProfile?.avatar_url ?? null,
        });
      }

      setMembers(merged);
    } finally {
      setMembersLoading(false);
    }
  }, [galleryId, ownerId]);

  const handleUsernameSearch = (text: string) => {
    setMemberSearch(text);
    setAddSuccess('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    const currentUserId = session?.user.id ?? '';
    searchTimeoutRef.current = setTimeout(async () => {
      const data = await searchUsers(text, currentUserId);
      const memberIds = new Set(members.map(m => m.user_id));
      setSearchResults((data ?? []).filter(p => !memberIds.has(p.id)));
    }, 300);
  };

  const handleAddMember = async (profile: SearchResult) => {
    setAddingUser(true);
    try {
      const { error: insertError } = await supabase
        .from('gallery_members')
        .insert({ gallery_id: galleryId, user_id: profile.id, role: 'member' });
      if (insertError) {
        if (insertError.code === '23505') {
          setAddSuccess(`${profile.username ?? 'User'} is already a member.`);
        } else {
          Alert.alert('Error', insertError.message);
        }
      } else {
        setAddSuccess('User added!');
        setMemberSearch('');
        setSearchResults([]);
        loadMembers();
      }
    } finally {
      setAddingUser(false);
    }
  };

  useEffect(() => {
    if (visible) loadMembers();
  }, [visible, galleryId]);

  useEffect(() => {
    if (!visible || !galleryId) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_gallery_member_statuses', { p_gallery_id: galleryId });
      if (error || !data) return;
      const map = new Map<string, string>();
      (data as Array<{ user_id: string; status: string }>).forEach(row => {
        map.set(row.user_id, row.status);
      });
      setMemberStatusMap(map);
    })();
  }, [visible, galleryId]);

  useEffect(() => {
    if (!visible || !canInvite || !session?.user.id || !galleryId) return;
    const userId = session.user.id;
    (async () => {
      try {
        const code = await getOrCreateGalleryInviteCode(userId, galleryId);
        setInviteLink(`momento://invite/${code}`);
      } catch {
        console.warn('[ContributorsModal] failed to generate gallery invite code');
        setInviteLink('');
      }
    })();
  }, [visible, canInvite, session?.user.id, galleryId]);

  const handleClose = () => {
    onClose();
    setMemberSearch('');
    setSearchResults([]);
    setAddSuccess('');
    setMemberStatusMap(new Map());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Contributors</Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {canInvite && (
            <>
              <Text style={styles.sectionLabel}>Add Friend</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Search friends by username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  value={memberSearch}
                  onChangeText={handleUsernameSearch}
                />
              </View>
              {searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  {searchResults.map((profile) => (
                    <Pressable
                      key={profile.id}
                      style={({ pressed }) => [styles.searchResultRow, pressed && { opacity: 0.7 }]}
                      onPress={() => handleAddMember(profile)}
                      disabled={addingUser}
                    >
                      {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatar} />
                      ) : (
                        <View style={styles.memberAvatarPlaceholder}>
                          <Text style={styles.memberAvatarLetter}>
                            {(profile.username ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }}>{profile.display_name || profile.username || 'unknown'}</Text>
                        <Text style={{ fontSize: 12, color: '#9ca3af' }}>@{profile.username}</Text>
                      </View>
                      <Text style={styles.searchResultAdd}>{addingUser ? '…' : 'Add'}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {!!addSuccess && <Text style={styles.addSuccessText}>{addSuccess}</Text>}
              <InviteViaSection senderId={session?.user.id ?? ''} visible={visible} galleryId={galleryId} />
              {inviteLink ? (
                <View style={styles.qrWrap}>
                  <QRCode
                    value={inviteLink}
                    size={160}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="M"
                  />
                  <Text style={styles.qrCaption}>Scan to join instantly</Text>
                </View>
              ) : null}
            </>
          )}
          <Text style={[styles.sectionLabel, { marginTop: canInvite ? 24 : 0 }]}>Members ({members?.length ?? 0})</Text>
          {membersLoading && members.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                  }}
                >
                  <SkeletonCircle size={36} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <SkeletonText width="55%" height={14} />
                    <View style={{ height: 4 }} />
                    <SkeletonText width="35%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : members.length === 0 ? (
            <Text style={styles.modalEmpty}>No members yet.</Text>
          ) : (
            members.map((member) => {
              const isPending = memberStatusMap.get(member.user_id) === 'pending';
              return (
                <View key={member.user_id} style={{ position: 'relative' }}>
                  <ContributorRow
                    member={member}
                    galleryId={galleryId}
                    isOwner={isOwner}
                    currentUserId={session?.user.id}
                    onNavigate={() => {
                      if (member.user_id === session?.user.id) return;
                      onClose();
                      navigation.navigate('FriendProfile', { userId: member.user_id, username: member.username ?? 'unknown' });
                    }}
                    onRefetch={loadMembers}
                  />
                  {isPending && (
                    <View style={styles.pendingPill} pointerEvents="none">
                      <Text style={styles.pendingPillText}>Pending</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafe: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { paddingVertical: 4, paddingHorizontal: 4 },
  modalCloseText: { fontSize: 16, color: '#FF6B6B', fontWeight: '600' },
  modalContent: { padding: 16 },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  searchDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultUsername: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  searchResultAdd: { fontSize: 15, color: '#FF6B6B', fontWeight: '600', marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6 },
  addSuccessText: { fontSize: 14, color: '#34C759', fontWeight: '600', marginBottom: 4 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLetter: { color: '#fff', fontSize: 17, fontWeight: '700' },
  qrWrap: { alignItems: 'center', marginTop: 20, paddingVertical: 16 },
  qrCaption: { marginTop: 10, fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  pendingPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingPillText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
});
