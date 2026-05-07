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
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  galleryId: string;
  isOwner: boolean;
};

type Member = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

type SearchResult = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export function ContributorsModal({ visible, onClose, galleryId, isOwner }: Props) {
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [addSuccess, setAddSuccess] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_members')
      .select('user_id, profiles(username, avatar_url)')
      .eq('gallery_id', galleryId);
    if (data) {
      setMembers(data.map((m: any) => ({
        user_id: m.user_id,
        username: (m.profiles as any)?.username ?? null,
        avatar_url: (m.profiles as any)?.avatar_url ?? null,
      })));
    }
  }, [galleryId]);

  const handleUsernameSearch = (text: string) => {
    setMemberSearch(text);
    setAddSuccess('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${text}%`)
        .limit(5);
      setSearchResults(data ?? []);
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

  const handleRemoveMember = async (userId: string) => {
    const { error: removeError } = await supabase
      .from('gallery_members')
      .delete()
      .eq('gallery_id', galleryId)
      .eq('user_id', userId);
    if (!removeError) loadMembers();
    else Alert.alert('Error', 'Could not remove member.');
  };

  useEffect(() => {
    if (visible) loadMembers();
  }, [visible, loadMembers]);

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
          <Text style={styles.sectionLabel}>Add Member</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            value={memberSearch}
            onChangeText={handleUsernameSearch}
          />
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
                  <Text style={styles.searchResultUsername}>@{profile.username ?? 'unknown'}</Text>
                  <Text style={styles.searchResultAdd}>{addingUser ? '…' : '+'}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!addSuccess && <Text style={styles.addSuccessText}>{addSuccess}</Text>}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Members</Text>
          {members.length === 0 ? (
            <Text style={styles.modalEmpty}>No members yet.</Text>
          ) : (
            members.map((member) => (
              <View key={member.user_id} style={styles.memberRow}>
                {member.avatar_url ? (
                  <Image source={{ uri: member.avatar_url }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarLetter}>
                      {(member.username ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.memberUsername}>
                  @{member.username ?? 'unknown'}
                  {member.user_id === session?.user.id ? '  (You)' : ''}
                </Text>
                {isOwner && member.user_id !== session?.user.id && (
                  <Pressable
                    style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
                    onPress={() => handleRemoveMember(member.user_id)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                )}
              </View>
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
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
  memberUsername: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  removeButton: { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  removeButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});
