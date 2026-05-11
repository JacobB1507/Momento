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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { InviteViaSection } from './InviteViaSection';
import { searchFriendsByName } from '../lib/friends';
import { GalleryQRButton } from './GalleryQRButton';
import { ContributorRow } from './ContributorRow';

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

export function ContributorsModal({ visible, onClose, galleryId, isOwner, ownerId }: Props) {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const currentMember = members.find(m => m.user_id === session?.user.id);
  const canInvite = isOwner || currentMember?.role === 'admin';
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [addSuccess, setAddSuccess] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
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
        .single();
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
  }, [galleryId, ownerId]);

  const handleUsernameSearch = (text: string) => {
    setMemberSearch(text);
    setAddSuccess('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    const currentUserId = session?.user.id ?? '';
    searchTimeoutRef.current = setTimeout(async () => {
      const { data } = await searchFriendsByName(currentUserId, text, 20);
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
        try {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'gallery_invite',
            data: { gallery_id: galleryId },
          });
        } catch {}
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

  const handleClose = () => {
    onClose();
    setMemberSearch('');
    setSearchResults([]);
    setAddSuccess('');
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
                  placeholder="Search friends..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={memberSearch}
                  onChangeText={handleUsernameSearch}
                />
                <GalleryQRButton />
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
                      <Text style={styles.searchResultAdd}>{addingUser ? '…' : '+'}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {!!addSuccess && <Text style={styles.addSuccessText}>{addSuccess}</Text>}
              <InviteViaSection senderId={session?.user.id ?? ''} visible={visible} />
            </>
          )}
          <Text style={[styles.sectionLabel, { marginTop: canInvite ? 24 : 0 }]}>Members</Text>
          {members.length === 0 ? (
            <Text style={styles.modalEmpty}>No members yet.</Text>
          ) : (
            members.map((member) => (
              <ContributorRow
                key={member.user_id}
                member={member}
                galleryId={galleryId}
                isOwner={isOwner}
                currentUserId={session?.user.id}
                onNavigate={() => {
                  onClose();
                  navigation.navigate('FriendProfile', { userId: member.user_id, username: member.username ?? 'unknown' });
                }}
                onRefetch={loadMembers}
              />
            ))
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
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
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
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultUsername: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  searchResultAdd: { fontSize: 22, color: '#FF6B6B', fontWeight: '600', lineHeight: 24 },
  addSuccessText: { fontSize: 14, color: '#34C759', fontWeight: '600', marginBottom: 4 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
