import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { acceptGalleryInvite, declineGalleryInvite } from '../lib/galleries';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryInvitePrompt'>;

export default function GalleryInvitePromptScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId } = route.params;
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [contributorCount, setContributorCount] = useState(0);
  const [contributorAvatars, setContributorAvatars] = useState<(string | null)[]>([]);
  const [mutualCount, setMutualCount] = useState(0);
  const [mutualAvatars, setMutualAvatars] = useState<(string | null)[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!galleryId || !userId) return;

    (async () => {
      try {
        const [galleryRes, membersRes, friendsRes, galleryMemberIdsRes] = await Promise.all([
          supabase
            .from('galleries')
            .select('id, title, cover_photo_url, created_by')
            .eq('id', galleryId)
            .single(),
          supabase
            .from('gallery_members')
            .select('user_id, profiles(avatar_url)', { count: 'exact' })
            .eq('gallery_id', galleryId)
            .eq('status', 'accepted')
            .limit(5),
          supabase
            .from('friends')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .eq('status', 'accepted'),
          supabase
            .from('gallery_members')
            .select('user_id')
            .eq('gallery_id', galleryId)
            .eq('status', 'accepted')
            .neq('user_id', userId),
        ]);

        if (galleryRes.data) {
          setTitle(galleryRes.data.title ?? '');
          setCoverUrl(galleryRes.data.cover_photo_url ?? null);
        }

        if (membersRes.data) {
          setContributorCount(membersRes.count ?? membersRes.data.length);
          setContributorAvatars(
            membersRes.data.map((m: any) => (m.profiles as any)?.avatar_url ?? null)
          );
        }

        const friendIds = new Set(
          (friendsRes.data ?? []).map((r: any) =>
            r.sender_id === userId ? r.receiver_id : r.sender_id
          )
        );
        const galleryMemberIds: string[] = (galleryMemberIdsRes.data ?? []).map((m: any) => m.user_id);
        const allMutualIds = galleryMemberIds.filter(id => friendIds.has(id));
        setMutualCount(allMutualIds.length);

        if (allMutualIds.length > 0) {
          const mutualIdsForAvatars = allMutualIds.slice(0, 5);
          const { data: mutualProfiles } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', mutualIdsForAvatars);
          setMutualAvatars(
            mutualIdsForAvatars.map(id =>
              mutualProfiles?.find((p: any) => p.id === id)?.avatar_url ?? null
            )
          );
        }
      } catch {
        console.warn('[GalleryInvitePromptScreen] data load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [galleryId, userId]);

  const actionInFlight = accepting || declining;

  const handleAccept = async () => {
    setAccepting(true);
    setActionError('');
    try {
      await acceptGalleryInvite(galleryId);
      navigation.replace('GalleryDetail', { galleryId });
    } catch {
      console.warn('[GalleryInvitePromptScreen] accept failed');
      setActionError('Could not accept invite. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    setActionError('');
    try {
      await declineGalleryInvite(galleryId);
      navigation.goBack();
    } catch {
      console.warn('[GalleryInvitePromptScreen] decline failed');
      setActionError('Could not decline invite. Please try again.');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        {/* X button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-outline" size={28} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.inviteLabel}>You've been invited to join</Text>
          <Text style={styles.galleryTitle} numberOfLines={2}>
            {title || 'Gallery'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#111827" style={styles.loader} />
        ) : (
          <>
            {/* Cover photo */}
            <View style={styles.coverContainer}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.cover}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Contributors */}
            <View style={[styles.centeredSection, { marginBottom: mutualCount > 0 ? 16 : 24 }]}>
              <Text style={styles.contributorCountText}>
                {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}
              </Text>
              {contributorAvatars.length > 0 && (
                <View style={styles.avatarRow}>
                  {contributorAvatars.slice(0, 5).map((uri, i) => (
                    <View
                      key={i}
                      style={[styles.avatarBubble, styles.avatarBubbleMd, i > 0 && styles.avatarOverlap]}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.avatarBubbleMd} />
                      ) : null}
                    </View>
                  ))}
                  {contributorCount > 5 && (
                    <View style={[styles.avatarBubble, styles.avatarBubbleMd, styles.avatarOverlap, styles.overflowBubble]}>
                      <Text style={styles.overflowText}>+{contributorCount - 5}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Mutuals */}
            {mutualCount > 0 && (
              <View style={[styles.centeredSection, { marginBottom: 24 }]}>
                <Text style={styles.mutualCountText}>
                  {mutualCount} mutual {mutualCount === 1 ? 'friend' : 'friends'}
                </Text>
                <View style={styles.avatarRow}>
                  {mutualAvatars.slice(0, 5).map((uri, i) => (
                    <View
                      key={i}
                      style={[styles.avatarBubble, styles.avatarBubbleSm, i > 0 && styles.avatarOverlap]}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.avatarBubbleSm} />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.declineBtn, actionInFlight && styles.btnDisabled]}
                onPress={handleDecline}
                disabled={actionInFlight}
                activeOpacity={0.8}
              >
                {declining
                  ? <ActivityIndicator size="small" color="#111827" />
                  : <Text style={styles.declineBtnText}>Decline</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, actionInFlight && styles.btnDisabled]}
                onPress={handleAccept}
                disabled={actionInFlight}
                activeOpacity={0.8}
              >
                {accepting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.acceptBtnText}>Accept</Text>}
              </TouchableOpacity>
            </View>

            {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  titleSection: {
    alignItems: 'center',
  },
  inviteLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  galleryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 32,
  },
  coverContainer: {
    marginBottom: 16,
  },
  cover: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredSection: {
    alignItems: 'center',
  },
  contributorCountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  mutualCountText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarBubbleMd: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarBubbleSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  overflowBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
});
