import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { fetchUserGalleries, acceptGalleryInvite, declineGalleryInvite } from '../lib/galleries';
import type { Gallery } from '../types/database';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Invites'>;

const PLACEHOLDER_COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

export default function InvitesScreen() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [pendingGalleries, setPendingGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchInFlight, setBatchInFlight] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const all = await fetchUserGalleries(userId);
      setPendingGalleries(all.filter(g => (g as any).membershipStatus === 'pending'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (galleryId: string) => {
    await acceptGalleryInvite(galleryId);
    setPendingGalleries(prev => prev.filter(g => g.id !== galleryId));
  };

  const handleReject = async (galleryId: string) => {
    await declineGalleryInvite(galleryId);
    setPendingGalleries(prev => prev.filter(g => g.id !== galleryId));
  };

  const handleAcceptAll = async () => {
    setBatchInFlight(true);
    try {
      for (const g of pendingGalleries) {
        await acceptGalleryInvite(g.id);
      }
      setPendingGalleries([]);
    } finally {
      setBatchInFlight(false);
    }
  };

  const handleRejectAll = () => {
    Alert.alert(
      'Reject all invites?',
      `This will reject all ${pendingGalleries.length} pending invite${pendingGalleries.length === 1 ? '' : 's'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject all',
          style: 'destructive',
          onPress: async () => {
            setBatchInFlight(true);
            try {
              for (const g of pendingGalleries) {
                await declineGalleryInvite(g.id);
              }
              setPendingGalleries([]);
            } finally {
              setBatchInFlight(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Invites</Text>
        {pendingGalleries.length > 0 ? (
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.6 }]}
              onPress={handleAcceptAll}
              disabled={batchInFlight}
            >
              <Text style={styles.headerActionAccept}>Accept all</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.6 }]}
              onPress={handleRejectAll}
              disabled={batchInFlight}
            >
              <Text style={styles.headerActionReject}>Reject all</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : pendingGalleries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No pending invites</Text>
          <Text style={styles.emptySubtitle}>You don't have any pending gallery invitations.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {pendingGalleries.map(gallery => (
            <View key={gallery.id} style={styles.row}>
              {gallery.cover_photo_url ? (
                <Image source={{ uri: gallery.cover_photo_url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, { backgroundColor: placeholderColor(gallery.id), alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.thumbnailInitial}>{gallery.title.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.rowMiddle}>
                <Text style={styles.galleryTitle} numberOfLines={1}>{gallery.title}</Text>
                <Text style={styles.galleryMeta}>
                  {gallery.privacy === 'private' ? 'Private' : gallery.privacy === 'friends' ? 'Friends' : 'Public'}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => handleAccept(gallery.id)}
                  disabled={batchInFlight}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => handleReject(gallery.id)}
                  disabled={batchInFlight}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: { width: 36, alignItems: 'flex-start' },
  backIcon: { fontSize: 28, color: '#111827', lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: { paddingHorizontal: 4 },
  headerActionAccept: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },
  headerActionReject: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  thumbnailInitial: { fontSize: 22, fontWeight: '800', color: '#fff' },
  rowMiddle: { flex: 1, gap: 2 },
  galleryTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  galleryMeta: { fontSize: 12, color: '#9CA3AF' },
  rowActions: { gap: 6 },
  acceptBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  acceptText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rejectBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  rejectText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
});
