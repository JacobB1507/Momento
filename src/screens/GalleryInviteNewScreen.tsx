import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import { clearDraft } from '../lib/createGalleryDraft';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryInviteNew'>;

type SmartSuggestion = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_friend: boolean;
  shared_gallery_count: number;
  mutual_count: number;
};

function generateQRMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

  const finder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        matrix[r+i][c+j] = true;
    }
  };
  finder(0,0); finder(0,14); finder(14,0);

  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  for (let i = 8; i < size-8; i++) for (let j = 8; j < size; j++) {
    if (!matrix[i][j]) matrix[i][j] = ((hash ^ (i * 31 + j * 17)) & 1) === 1;
  }
  return matrix;
}

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

function InviteRow({ item, invitedIds, onInvite, subLabel }: {
  item: SmartSuggestion;
  invitedIds: Set<string>;
  onInvite: (userId: string) => void;
  subLabel?: string;
}) {
  const invited = invitedIds.has(item.user_id);
  return (
    <View style={styles.personRow}>
      <Avatar uri={item.avatar_url} name={item.display_name} username={item.username} size={44} />
      <View style={styles.personRowInfo}>
        <Text style={styles.personRowName} numberOfLines={1}>{item.display_name || item.username}</Text>
        <Text style={styles.personRowUsername}>@{item.username}</Text>
        {subLabel ? <Text style={styles.personRowSub}>{subLabel}</Text> : null}
      </View>
      <TouchableOpacity
        onPress={() => !invited && onInvite(item.user_id)}
        style={[styles.inviteBtn, invited && styles.inviteBtnInvited]}
        activeOpacity={0.7}
      >
        <Text style={[styles.inviteBtnText, invited && styles.inviteBtnTextInvited]}>
          {invited ? 'Invited ✓' : 'Invite'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GalleryInviteNewScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId: routeGalleryId, galleryTitle, privacy, pendingCreate } = route.params;

  const [currentUserId, setCurrentUserId] = useState('');
  const [createdGalleryId, setCreatedGalleryId] = useState<string | null>(routeGalleryId ?? null);
  const [inviteCode, setInviteCode] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [copied, setCopied] = useState(false);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (pendingCreate && !createdGalleryId) {
      initUser();
    } else {
      init(createdGalleryId!);
    }
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const code = await getOrCreateInviteCode(user.id);
    setInviteCode(code);
  };

  const init = async (gid: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const code = await getOrCreateInviteCode(user.id);
    setInviteCode(code);

    const { data: members } = await supabase
      .from('gallery_members')
      .select('user_id')
      .eq('gallery_id', gid);
    setExistingMemberIds(new Set((members ?? []).map((m: { user_id: string }) => m.user_id)));

    setSmartLoading(true);
    const { data: suggestions } = await supabase.rpc('get_smart_invite_suggestions', {
      uid: user.id,
      gid,
    });
    setSmartSuggestions(suggestions ?? []);
    setSmartLoading(false);
  };

  const createGallery = async (): Promise<string | null> => {
    if (createdGalleryId) return createdGalleryId;
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('galleries')
        .insert({ title: galleryTitle, owner_id: user.id, privacy: privacy ?? 'friends' })
        .select('id')
        .single();
      if (error) throw error;
      setCreatedGalleryId(data.id);
      await init(data.id);
      return data.id;
    } finally {
      creatingRef.current = false;
    }
  };

  const getOrCreateInviteCode = async (userId: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('invites')
      .select('code')
      .eq('sender_id', userId)
      .maybeSingle();
    if (existing?.code) return existing.code;

    const code = Math.random().toString(36).substring(2, 10);
    await supabase.from('invites').insert({ sender_id: userId, code });
    return code;
  };

  const handleInvite = async (userId: string) => {
    const gid = await createGallery();
    if (!gid) return;
    await supabase.from('gallery_members').insert({ gallery_id: gid, user_id: userId, role: 'member', status: 'pending' });
    setInvitedIds(prev => new Set([...prev, userId]));
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
  const qrMatrix = generateQRMatrix(inviteLink);
  const cellSize = 8;

  const searchActive = searchText.trim().length > 0;

  const friendSuggestions = smartSuggestions
    .filter(s => s.is_friend && !existingMemberIds.has(s.user_id))
    .slice(0, 7);
  const peopleSuggestions = smartSuggestions
    .filter(s => !s.is_friend && !existingMemberIds.has(s.user_id))
    .slice(0, 5);
  const filteredSuggestions = searchActive
    ? smartSuggestions
        .filter(s => !existingMemberIds.has(s.user_id))
        .filter(s => {
          const q = searchText.toLowerCase();
          return (s.display_name ?? '').toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
        })
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (createdGalleryId) {
              Alert.alert(
                'Leave gallery?',
                'Your gallery was created. Do you want to leave without inviting anyone?',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
          style={styles.headerSide}
          hitSlop={12}
        >
          <Text style={styles.headerBack}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <Pressable
          onPress={async () => {
            const gid = createdGalleryId ?? await createGallery();
            if (!gid) { navigation.goBack(); return; }
            clearDraft();
            navigation.replace('GalleryDetail', { galleryId: gid });
          }}
          style={[styles.headerSide, styles.headerSideRight]}
          hitSlop={12}
        >
          <Text style={styles.headerDone}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search input */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or username..."
          placeholderTextColor="#6B7280"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {smartLoading ? (
          <ActivityIndicator color="#E91E8C" style={{ marginVertical: 24 }} />
        ) : searchActive ? (
          /* Filtered flat list */
          <View style={styles.personList}>
            {filteredSuggestions.length === 0 ? (
              <Text style={styles.emptyText}>No results for "{searchText}"</Text>
            ) : (
              filteredSuggestions.map((item, index) => (
                <View key={item.user_id}>
                  {index > 0 && <View style={styles.rowSeparator} />}
                  <InviteRow
                    item={item}
                    invitedIds={invitedIds}
                    onInvite={handleInvite}
                    subLabel={
                      item.is_friend && item.shared_gallery_count > 0
                        ? `${item.shared_gallery_count} galleries together`
                        : !item.is_friend && item.mutual_count > 0
                        ? `${item.mutual_count} mutual friends`
                        : undefined
                    }
                  />
                </View>
              ))
            )}
          </View>
        ) : (
          /* Smart suggestion sections */
          <>
            {friendSuggestions.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.dividerLabel}>FRIENDS</Text>
                <View style={styles.personList}>
                  {friendSuggestions.map((item, index) => (
                    <View key={item.user_id}>
                      {index > 0 && <View style={styles.rowSeparator} />}
                      <InviteRow
                        item={item}
                        invitedIds={invitedIds}
                        onInvite={handleInvite}
                        subLabel={item.shared_gallery_count > 0 ? `${item.shared_gallery_count} galleries together` : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {peopleSuggestions.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.dividerLabel}>PEOPLE YOU MAY KNOW</Text>
                <View style={styles.personList}>
                  {peopleSuggestions.map((item, index) => (
                    <View key={item.user_id}>
                      {index > 0 && <View style={styles.rowSeparator} />}
                      <InviteRow
                        item={item}
                        invitedIds={invitedIds}
                        onInvite={handleInvite}
                        subLabel={item.mutual_count > 0 ? `${item.mutual_count} mutual friends` : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Section — Invite via Link */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Invite via Link</Text>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
          </View>
          <View style={styles.linkButtons}>
            <TouchableOpacity onPress={handleCopy} style={styles.linkBtn} activeOpacity={0.7}>
              <Text style={styles.linkBtnIcon}>⎘</Text>
              <Text style={styles.linkBtnText}>{copied ? 'Copied!' : 'Copy Link'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.linkBtn} activeOpacity={0.7}>
              <Text style={styles.linkBtnIcon}>↑</Text>
              <Text style={styles.linkBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section — QR Code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QR Code</Text>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#000000', padding: 16, borderRadius: 12 }}>
              <View style={{ backgroundColor: 'white', padding: 8, borderRadius: 4 }}>
              <View style={{ width: 21 * cellSize, height: 21 * cellSize }}>
                {qrMatrix.map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row' }}>
                    {row.map((cell, j) => (
                      <View key={j} style={{ width: cellSize, height: cellSize, backgroundColor: cell ? 'black' : 'white' }} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              Scan with camera to join instantly
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerSide: { width: 60, justifyContent: 'center' },
  headerSideRight: { alignItems: 'flex-end' },
  headerBack: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1F2937' },
  headerDone: { fontSize: 16, fontWeight: '600', color: '#E91E8C' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },

  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 20,
  },

  dividerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
  },

  suggestionSection: { marginBottom: 24 },

  personList: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  personRowInfo: { flex: 1 },
  personRowName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  personRowUsername: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },
  personRowSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  rowSeparator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },

  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },

  // Initials placeholder
  initialsCircle: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: '#6B7280', fontWeight: '700' },

  inviteBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  inviteBtnInvited: { backgroundColor: '#E5E7EB' },
  inviteBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  inviteBtnTextInvited: { color: '#6B7280' },

  section: { marginBottom: 32, marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },

  // Link section
  linkBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  linkText: { fontSize: 13, color: '#6B7280', fontFamily: 'monospace' },
  linkButtons: { flexDirection: 'row', gap: 10 },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 13,
  },
  linkBtnIcon: { fontSize: 16, color: '#E91E8C' },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#E91E8C' },
});
