import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import { clearDraft, getDraft } from '../lib/createGalleryDraft';
import { applyTagToGallery } from '../lib/tags';
import { checkRateLimit } from '../lib/rateLimit';
import { userFacingError, reportError } from '../lib/errorReport';
import { SearchPersonRow } from '../components/SearchPersonRow';
import { FriendInviteCard } from '../components/FriendInviteCard';
import LiveJoinersList from '../components/LiveJoinersList';

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

type Friend = {
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recentCollaboratorIds, setRecentCollaboratorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutualCountsByFriendId, setMutualCountsByFriendId] = useState<Record<string, number>>({});
  const scrollRef = useRef<ScrollView>(null);
  const searchBarYRef = useRef(0);
  const creatingRef = useRef(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [acceptedContributorCount, setAcceptedContributorCount] = useState(0);
  const [acceptedContributorAvatars, setAcceptedContributorAvatars] = useState<string[]>([]);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerScale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (pendingCreate && !createdGalleryId) {
      createGallery().catch(e => reportError('GalleryInviteNewScreen.mountCreate', e));
    } else {
      init(createdGalleryId!);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!createdGalleryId) return;
    const galleryId = createdGalleryId;
    loadAcceptedContributors(galleryId);
    const interval = setInterval(() => loadAcceptedContributors(galleryId), 5000);
    const channel = supabase
      .channel(`gallery-members-${galleryId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gallery_members',
        filter: `gallery_id=eq.${galleryId}`,
      }, () => loadAcceptedContributors(galleryId))
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [createdGalleryId]);

  useEffect(() => {
    Animated.timing(bannerOpacity, {
      toValue: acceptedContributorCount > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [acceptedContributorCount]);

  useEffect(() => {
    if (prevCountRef.current === 0 && acceptedContributorCount === 1) {
      Animated.sequence([
        Animated.timing(bannerScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(bannerScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    prevCountRef.current = acceptedContributorCount;
  }, [acceptedContributorCount]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) { setLoading(false); return; }
        const uid = session.user.id;

        const [friendResult, galleryResult] = await Promise.all([
          supabase
            .from('friends')
            .select('sender_id, receiver_id, status')
            .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
            .eq('status', 'accepted'),
          supabase
            .from('gallery_members')
            .select('gallery_id, invited_at')
            .eq('user_id', uid)
            .order('invited_at', { ascending: false })
            .limit(20),
        ]);

        if (cancelled) return;

        const friendIds = (friendResult.data ?? [])
          .map((r: any) => r.sender_id === uid ? r.receiver_id : r.sender_id);

        if (friendIds.length > 0) {
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', friendIds);
          if (!cancelled) setFriends(profileRows ?? []);

          // Compute mutual friend counts for each friend
          const { data: friendsOfFriends } = await supabase
            .from('friends')
            .select('sender_id, receiver_id')
            .or(`sender_id.in.(${friendIds.join(',')}),receiver_id.in.(${friendIds.join(',')})`)
            .eq('status', 'accepted');

          const counts: Record<string, number> = {};
          const friendIdSet = new Set(friendIds);
          for (const f of friendIds) counts[f] = 0;
          for (const row of friendsOfFriends ?? []) {
            const a = row.sender_id;
            const b = row.receiver_id;
            if (friendIdSet.has(a) && friendIdSet.has(b) && a !== uid && b !== uid) {
              counts[a] = (counts[a] ?? 0) + 1;
              counts[b] = (counts[b] ?? 0) + 1;
            }
          }
          if (!cancelled) setMutualCountsByFriendId(counts);
        } else {
          if (!cancelled) setFriends([]);
        }

        const galleryIds = (galleryResult.data ?? []).map((g: any) => g.gallery_id);
        if (galleryIds.length > 0) {
          const { data: collabRows } = await supabase
            .from('gallery_members')
            .select('user_id, invited_at')
            .in('gallery_id', galleryIds)
            .neq('user_id', uid)
            .order('invited_at', { ascending: false })
            .limit(50);

          if (!cancelled) {
            const seen = new Set<string>();
            const ordered: string[] = [];
            for (const row of collabRows ?? []) {
              if (!seen.has(row.user_id)) {
                seen.add(row.user_id);
                ordered.push(row.user_id);
              }
            }
            setRecentCollaboratorIds(ordered);
          }
        } else {
          if (!cancelled) setRecentCollaboratorIds([]);
        }
      } catch (e) {
        reportError('GalleryInviteNewScreen.loadFriendsAndCollaborators', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const loadAcceptedContributors = async (galleryId: string) => {
    try {
      const { data } = await supabase
        .from('gallery_members')
        .select('user_id, profiles(avatar_url)')
        .eq('gallery_id', galleryId)
        .eq('status', 'accepted')
        .neq('user_id', currentUserId)
        .limit(20);
      if (data) {
        setAcceptedContributorCount(data.length);
        setAcceptedContributorAvatars(
          (data as any[]).map(r => r.profiles?.avatar_url).filter(Boolean).slice(0, 5)
        );
      }
    } catch {
      // keep current count on error
    }
  };

  const init = async (gid: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const code = await getOrCreateGalleryInviteCode(user.id, gid);
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
      const allowed = await checkRateLimit('gallery_create');
      if (!allowed) throw new Error('Rate limit exceeded. Please wait a few minutes before creating another gallery.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('galleries')
        .insert({ title: galleryTitle, created_by: user.id, privacy: privacy ?? 'friends' })
        .select('id')
        .single();
      if (error) {
        console.error('[createGallery] DB error:', error.message, error.code, error.details);
        throw error;
      }
      setCreatedGalleryId(data.id);
      await init(data.id);
      // Apply any tags selected during creation. Best-effort — do not block on failure.
      const draft = getDraft();
      const draftSelectedTagIds = (draft as any)?.selectedTagIds ?? [];
      if (Array.isArray(draftSelectedTagIds) && draftSelectedTagIds.length > 0 && data.id) {
        await Promise.allSettled(
          draftSelectedTagIds.map((tagId: string) => applyTagToGallery(data.id, tagId))
        );
      }
      return data.id;
    } finally {
      creatingRef.current = false;
    }
  };

  const getOrCreateGalleryInviteCode = async (userId: string, galleryId: string): Promise<string> => {
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
  };

  const handleInvite = async (userId: string) => {
    try {
      const gid = await createGallery();
      if (!gid) {
        Alert.alert('Could not create gallery', 'Something went wrong. Please try again.');
        return;
      }
      await supabase.from('gallery_members').insert({ gallery_id: gid, user_id: userId, role: 'member', status: 'pending' });
      setInvitedIds(prev => new Set([...prev, userId]));
    } catch (err) {
      Alert.alert('Could not create gallery', userFacingError(err));
      reportError('GalleryInviteNewScreen.handleInvite', err);
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: inviteLink, url: inviteLink });
  };

  const inviteLink = `momento://invite/${inviteCode}`;

  const searchActive = searchText.trim().length > 0;

  const peopleSuggestions = smartSuggestions
    .filter(s => !s.is_friend && !existingMemberIds.has(s.user_id))
    .slice(0, 5);

  const displayedFriends = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length > 0) {
      return friends.filter(f =>
        (f.username ?? '').toLowerCase().includes(q) ||
        (f.display_name ?? '').toLowerCase().includes(q)
      );
    }
    const rank = new Map(recentCollaboratorIds.map((id, i) => [id, i]));
    const sorted = [...friends].sort((a, b) => {
      const ar = rank.has(a.id) ? rank.get(a.id)! : Infinity;
      const br = rank.has(b.id) ? rank.get(b.id)! : Infinity;
      if (ar !== br) return ar - br;
      return (a.display_name ?? a.username ?? '').localeCompare(b.display_name ?? b.username ?? '');
    });
    return sorted.slice(0, 5);
  }, [friends, recentCollaboratorIds, searchText]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={async () => {
            if (pendingCreate && createdGalleryId) {
              if (acceptedContributorCount > 0 || invitedIds.size > 0) {
                clearDraft();
                navigation.goBack();
              } else {
                Alert.alert(
                  'Discard this gallery?',
                  'The gallery you created will be deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: async () => {
                      await supabase.from('galleries').delete().eq('id', createdGalleryId);
                      clearDraft();
                      navigation.goBack();
                    }},
                  ]
                );
              }
            } else {
              navigation.goBack();
            }
          }}
          style={styles.headerSide}
          hitSlop={12}
        >
          <Text style={styles.headerBack}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Invite friends to contribute</Text>
        <Pressable
          onPress={async () => {
            const proceed = async () => {
              try {
                const gid = createdGalleryId ?? await createGallery();
                if (!gid) {
                  Alert.alert('Could not create gallery', 'Something went wrong. Please try again.');
                  return;
                }
                clearDraft();
                navigation.replace('GalleryDetail', { galleryId: gid });
              } catch (err) {
                Alert.alert('Could not create gallery', userFacingError(err));
                reportError('GalleryInviteNewScreen.handleDone', err);
              }
            };
            if (invitedIds.size === 0) {
              Alert.alert(
                'Create gallery without contributors?',
                "You can always invite people later from the gallery's Contributors panel.",
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Create', onPress: proceed },
                ]
              );
            } else {
              await proceed();
            }
          }}
          style={[styles.headerSide, styles.headerSideRight]}
          hitSlop={12}
        >
          <Text style={styles.headerDone}>Done</Text>
        </Pressable>
      </View>

      {acceptedContributorCount > 0 && (
        <Animated.View style={[styles.contributorBanner, { opacity: bannerOpacity, transform: [{ scale: bannerScale }] }]}>
          <View style={{ flexDirection: 'row' }}>
            {acceptedContributorAvatars.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.bannerAvatar, i > 0 ? { marginLeft: -8 } : {}]}
              />
            ))}
          </View>
          <Text style={styles.bannerText}>{acceptedContributorCount} joined</Text>
        </Animated.View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Contributors can add photos to this gallery.</Text>

        {/* Section — QR Code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QR Code</Text>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#000000', padding: 16, borderRadius: 12 }}>
              <View style={{ backgroundColor: 'white', padding: 8, borderRadius: 4 }}>
                {inviteCode ? (
                  <QRCode
                    value={inviteLink}
                    size={180}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="M"
                  />
                ) : (
                  <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Generating link...</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              Scan with camera to join instantly
            </Text>
          </View>
        </View>

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

        {/* Section — Live Joiners */}
        <LiveJoinersList
          galleryId={createdGalleryId}
          currentUserId={currentUserId}
          isOwner={true}
        />

        {/* Search bar */}
        <View onLayout={(e) => { searchBarYRef.current = e.nativeEvent.layout.y; }}>
          <TextInput
            style={[styles.searchInput, { marginTop: 8 }]}
            placeholder="Search friends by name or username..."
            placeholderTextColor="#6B7280"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => scrollRef.current?.scrollTo({ y: Math.max(0, searchBarYRef.current - 8), animated: true })}
          />
        </View>

        {/* Section — Friends (idle: top-5 by recency; hidden while searching) */}
        <View style={styles.friendsSection}>
          <Text style={styles.dividerLabel}>FRIENDS</Text>
          {loading ? (
            <ActivityIndicator color="#E91E8C" style={{ marginVertical: 12 }} />
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>You haven't added any friends yet</Text>
          ) : !searchActive ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {displayedFriends.map(friend => (
                <FriendInviteCard
                  key={friend.id}
                  friend={friend}
                  mutualCount={mutualCountsByFriendId[friend.id] ?? 0}
                  isInvited={invitedIds.has(friend.id)}
                  onInvite={() => handleInvite(friend.id)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Search results — only shown when typing */}
        {searchActive && (
          <View style={styles.personList}>
            {displayedFriends.length === 0 ? (
              <Text style={styles.emptyText}>No friends match "{searchText}"</Text>
            ) : (
              displayedFriends.map((f, index) => {
                const isInvited = invitedIds.has(f.id);
                return (
                  <View key={f.id}>
                    {index > 0 && <View style={styles.rowSeparator} />}
                    <TouchableOpacity
                      onPress={() => { if (!isInvited) handleInvite(f.id); }}
                      activeOpacity={isInvited ? 1 : 0.8}
                      disabled={isInvited}
                    >
                      <View
                        pointerEvents="none"
                        style={isInvited ? styles.invitedCardWrapper : undefined}
                      >
                        <SearchPersonRow
                          user={{ id: f.id, username: f.username, display_name: f.display_name, avatar_url: f.avatar_url, bio: null }}
                          currentUserId={currentUserId}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 400 }} />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },

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
  friendsSection: { marginBottom: 16 },
  invitedCardWrapper: { backgroundColor: '#F0FDF4' },

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

  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },

  contributorBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
});
