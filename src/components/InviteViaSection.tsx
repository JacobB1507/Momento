import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { createInviteLink } from '../lib/friends';

type Props = {
  senderId: string;
  visible: boolean;
  galleryId?: string;
};

export function InviteViaSection({ senderId, visible, galleryId }: Props) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !senderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setInviteLink(null);
    createInviteLink(senderId, galleryId).then((link) => {
      if (cancelled) return;
      if (link) {
        setInviteLink(link);
      } else {
        setError('Could not generate invite link. Try again later.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, senderId, galleryId]);

  const message = inviteLink
    ? `Hey! Join my gallery on Momento — download the app and use my invite link: ${inviteLink}`
    : '';

  const handleMessage = () => {
    if (!inviteLink) return;
    Linking.openURL(`sms:?body=${encodeURIComponent(message)}`).catch(() => {});
  };

  const handleEmail = () => {
    if (!inviteLink) return;
    const subject = encodeURIComponent('Join my Momento gallery');
    const body = encodeURIComponent(message);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {});
  };

  const handleOther = async () => {
    if (!inviteLink) return;
    await Share.share({ message });
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>OR INVITE VIA</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.pillButton, pressed && styles.pillPressed]}
          onPress={handleMessage}
          disabled={!inviteLink || loading}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FF6B6B" />
          <Text style={styles.pillLabel}>Message</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.pillButton, pressed && styles.pillPressed]}
          onPress={handleEmail}
          disabled={!inviteLink || loading}
        >
          <Ionicons name="mail-outline" size={20} color="#FF6B6B" />
          <Text style={styles.pillLabel}>Email</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.pillButton, pressed && styles.pillPressed]}
          onPress={handleOther}
          disabled={!inviteLink || loading}
        >
          <Ionicons name="share-outline" size={20} color="#FF6B6B" />
          <Text style={styles.pillLabel}>Other</Text>
        </Pressable>
      </View>
      {loading && <Text style={styles.statusText}>Generating invite…</Text>}
      {!!error && <Text style={[styles.statusText, styles.errorText]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pillPressed: { opacity: 0.7 },
  pillLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  statusText: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 10 },
  errorText: { color: '#EF4444' },
});
