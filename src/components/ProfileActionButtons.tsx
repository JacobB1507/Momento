import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  userId: string;
  currentUserId: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  onFriendPress: () => void;
  onMessagePress: () => void;
};

export default function ProfileActionButtons({ isFriend, hasPendingRequest, onFriendPress, onMessagePress }: Props) {
  const friendLabel = isFriend ? 'Friends ✓' : hasPendingRequest ? 'Requested' : 'Add Friend';
  const friendDisabled = isFriend || hasPendingRequest;

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          friendDisabled ? styles.btnOutline : styles.btnPrimary,
          pressed && !friendDisabled && { opacity: 0.8 },
        ]}
        onPress={onFriendPress}
        disabled={friendDisabled}
      >
        <Text style={[styles.btnText, friendDisabled && styles.btnTextOutline]}>{friendLabel}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btn, styles.btnDark, pressed && { opacity: 0.8 }]}
        onPress={onMessagePress}
      >
        <Text style={styles.btnText}>Message</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 12, gap: 12 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#FF6B6B' },
  btnOutline: { borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  btnDark: { backgroundColor: '#1a1a1a' },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnTextOutline: { color: '#111827' },
});
