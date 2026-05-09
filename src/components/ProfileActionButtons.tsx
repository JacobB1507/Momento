import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createConversation } from '../lib/messages';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  userId: string;
  currentUserId: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  onFriendPress: () => void;
  onMessagePress: () => void;
};

export default function ProfileActionButtons({ userId, currentUserId, isFriend, hasPendingRequest, onFriendPress, onMessagePress }: Props) {
  const navigation = useNavigation<NavProp>();

  const friendLabel = isFriend ? 'Friends ✓' : hasPendingRequest ? 'Requested' : 'Add Friend';
  const friendDisabled = isFriend || hasPendingRequest;

  const handleMessagePress = async () => {
    if (isFriend) {
      onMessagePress();
      return;
    }
    const conversation = await createConversation(currentUserId, userId);
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      otherUserId: userId,
      otherUsername: '',
      isPendingRequest: true,
    });
  };

  const msgLabel = isFriend ? 'Message' : 'Request to Message';

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
        style={({ pressed }) => [
          styles.btn,
          isFriend ? styles.btnDark : styles.btnDarkOutline,
          pressed && { opacity: 0.8 },
        ]}
        onPress={handleMessagePress}
      >
        <Text style={[styles.btnText, !isFriend && styles.btnTextDark]}>
          {msgLabel}
        </Text>
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
  btnDarkOutline: { borderWidth: 1.5, borderColor: '#1a1a1a', backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnTextOutline: { color: '#111827' },
  btnTextDark: { color: '#1a1a1a' },
});
