import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';

type Props = {
  visible: boolean;
  galleryId: string;
  galleryTitle: string;
  onClose: () => void;
  onDone: () => void;
};

type SuggestedInvite = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  shared_gallery_count: number;
};

type SearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function getInitials(name: string | null, username: string) {
  const src = name?.trim() || username;
  return src.substring(0, 2).toUpperCase();
}

function Avatar({ uri, name, username, size }: { uri: string | null; name: string | null; username: string; size: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.initialsCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.33 }]}>{getInitials(name, username)}</Text>
    </View>
  );
}

export default function GalleryInviteSheet({ visible, galleryId, galleryTitle, onClose, onDone }: Props) {
  const [currentUserId, setCurrentUserId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [suggested, setSuggested] = useState<SuggestedInvite[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setSearchResults([]);
      setInvitedIds(new Set());
      setCopied(false);
      return;
    }
    init();
  }, [visible, galleryId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const code = await getOrCreateInviteCode(user.id);
    setInviteCode(code);

    const { data: members } = await supabase
      .from('gallery_members')
      .select('user_id')
      .eq('gallery_id', galleryId);
    setExistingMemberIds(new Set((members ?? []).map((m: { user_id: string }) => m.user_id)));

    setSuggestedLoading(true);
    const { data: suggestions } = await supabase.rpc('get_suggested_invites', {
      uid: user.id,
      gallery_id: galleryId,
      result_limit: 10,
    });
    setSuggested(suggestions ?? []);
    setSuggestedLoading(false);
  };

  const getOrCreateInviteCode = async (userId: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('invites')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing?.code) return existing.code;

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from('invites').insert({ user_id: userId, code });
    return code;
  };

  const handleInvite = async (userId: string) => {
    await supabase.from('gallery_members').insert({ gallery_id: galleryId, user_id: userId, role: 'member' });
    setInvitedIds(prev => new Set([...prev, userId]));
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${text}%,display_name.ilike.%${text}%`)
        .limit(20);
      setSearchResults(
        (data ?? []).filter(
          (p: SearchResult) => !existingMemberIds.has(p.id) && !invitedIds.has(p.id) && p.id !== currentUserId,
        ),
      );
    }, 300);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: `Join my gallery on Momento! ${inviteLink}` });
  };

  const inviteLink = `momento://invite/${inviteCode}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Invite Friends</Text>
              <Text style={styles.subtitle}>Invite people to {galleryTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1 — Suggested */}
            <Text style={styles.sectionHeader}>Suggested</Text>
            {suggestedLoading ? (
              <ActivityIndicator color="#E91E8C" style={{ marginVertical: 16 }} />
            ) : suggested.length > 0 ? (
              <FlatList
                data={suggested}
                horizontal
                keyExtractor={item => item.user_id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 2, paddingBottom: 4 }}
                scrollEnabled
                style={{ marginBottom: 8 }}
                renderItem={({ item }) => {
                  const invited = invitedIds.has(item.user_id);
                  return (
                    <View style={styles.suggestCard}>
                      <Avatar uri={item.avatar_url} name={item.display_name} username={item.username} size={48} />
                      <Text style={styles.suggestName} numberOfLines={1}>
                        {item.display_name || item.username}
                      </Text>
                      {item.shared_gallery_count > 0 && (
                        <Text style={styles.suggestMutual}>{item.shared_gallery_count} galleries together</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => !invited && handleInvite(item.user_id)}
                        style={[styles.suggestBtn, invited && styles.suggestBtnInvited]}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestBtnText}>{invited ? '✓' : '+'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            ) : null}

            {/* Section 2 — Invite by username */}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Invite by username</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or name..."
              placeholderTextColor="#6B7280"
              value={searchText}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchResults.map(item => {
              const invited = invitedIds.has(item.id);
              return (
                <View key={item.id} style={styles.searchRow}>
                  <Avatar uri={item.avatar_url} name={item.display_name} username={item.username} size={40} />
                  <View style={styles.searchRowInfo}>
                    <Text style={styles.searchRowName}>{item.display_name || item.username}</Text>
                    <Text style={styles.searchRowUsername}>@{item.username}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => !invited && handleInvite(item.id)}
                    style={[styles.inviteBtn, invited && styles.inviteBtnInvited]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.inviteBtnText, invited && styles.inviteBtnTextInvited]}>
                      {invited ? 'Invited' : 'Invite'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Section 3 — Invite via link */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Invite via link</Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
            </View>
            <View style={styles.linkButtons}>
              <TouchableOpacity onPress={handleCopy} style={styles.linkBtn} activeOpacity={0.7}>
                <Text style={styles.linkBtnText}>{copied ? 'Copied!' : 'Copy Link'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={[styles.linkBtn, styles.linkBtnShare]} activeOpacity={0.7}>
                <Text style={styles.linkBtnText}>Share Link</Text>
              </TouchableOpacity>
            </View>

            {/* Section 4 — QR Code */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Invite via QR Code</Text>
            {inviteCode ? (
              <View style={styles.qrContainer}>
                <QRCode value={inviteLink} size={180} backgroundColor="#1C1C1E" color="#FFFFFF" />
                <Text style={styles.qrCaption}>Friends can scan this to join instantly</Text>
              </View>
            ) : (
              <ActivityIndicator color="#E91E8C" style={{ marginVertical: 16 }} />
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onDone} style={styles.doneBtn} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  closeBtn: { paddingLeft: 12, paddingTop: 2 },
  closeX: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },

  // Suggested cards
  suggestCard: { width: 80, alignItems: 'center', gap: 5 },
  suggestName: { fontSize: 12, color: '#FFFFFF', textAlign: 'center', width: 72 },
  suggestMutual: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', width: 72 },
  suggestBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E91E8C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestBtnInvited: { backgroundColor: '#3A3A3C' },
  suggestBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', lineHeight: 22 },

  // Initials placeholder
  initialsCircle: { backgroundColor: '#3A3A3C', alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: '#FFFFFF', fontWeight: '700' },

  // Search section
  searchInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  searchRowInfo: { flex: 1 },
  searchRowName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  searchRowUsername: { fontSize: 13, color: '#9CA3AF' },
  inviteBtn: {
    backgroundColor: '#E91E8C',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  inviteBtnInvited: { backgroundColor: '#3A3A3C' },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  inviteBtnTextInvited: { color: '#9CA3AF' },

  // Link section
  linkBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  linkText: { fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace' },
  linkButtons: { flexDirection: 'row', gap: 10 },
  linkBtn: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkBtnShare: { backgroundColor: '#2C2C2E' },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#E91E8C' },

  // QR section
  qrContainer: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  qrCaption: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, backgroundColor: '#111111' },
  doneBtn: {
    backgroundColor: '#E91E8C',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
