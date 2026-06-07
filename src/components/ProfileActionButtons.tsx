import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { createConversation } from '../lib/messages';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RelationshipState = 'none' | 'outgoing' | 'incoming' | 'friends' | 'blocked';

type Props = {
  userId: string;
  currentUserId: string;
  onMessagePress: () => void;
};

export default function ProfileActionButtons({ userId, currentUserId, onMessagePress }: Props) {
  const navigation = useNavigation<NavProp>();
  const [relationship, setRelationship] = useState<RelationshipState>('none');
  const [mutating, setMutating] = useState(false);
  const [msgSubmitting, setMsgSubmitting] = useState(false);

  const fetchRelationship = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_relationship_state', { p_other: userId });
    if (!error && data != null) {
      setRelationship(data as RelationshipState);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchRelationship();
    }, [fetchRelationship])
  );

  const handleFriendPress = async () => {
    if (mutating) return;

    const prev = relationship;
    let optimistic: RelationshipState;
    let rpcName: string;
    let params: Record<string, unknown>;

    if (relationship === 'none') {
      optimistic = 'outgoing';
      rpcName = 'send_friend_request';
      params = { p_receiver: userId };
    } else if (relationship === 'outgoing') {
      optimistic = 'none';
      rpcName = 'cancel_friend_request';
      params = { p_receiver: userId };
    } else if (relationship === 'incoming') {
      optimistic = 'friends';
      rpcName = 'respond_friend_request';
      params = { p_requester: userId, p_accept: true };
    } else {
      return;
    }

    setRelationship(optimistic);
    setMutating(true);
    const { error } = await supabase.rpc(rpcName, params);
    if (error) {
      setRelationship(prev);
    }
    await fetchRelationship();
    setMutating(false);
  };

  const handleMessagePress = async () => {
    if (relationship === 'friends') {
      onMessagePress();
      return;
    }
    setMsgSubmitting(true);
    try {
      const conversation = await createConversation(currentUserId, userId);
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        otherUserId: userId,
        otherUsername: '',
        isPendingRequest: true,
      });
    } finally {
      setMsgSubmitting(false);
    }
  };

  const isFriends = relationship === 'friends';
  const showFriendBtn = relationship !== 'blocked';
  const friendIsOutline = relationship === 'outgoing' || relationship === 'friends';
  const friendIsDisabled = relationship === 'friends' || mutating;

  const friendLabel =
    relationship === 'outgoing' ? 'Requested' :
    relationship === 'incoming' ? 'Accept Request' :
    relationship === 'friends' ? 'Friends' :
    'Add Friend';

  const msgLabel = isFriends ? 'Message' : 'Request to Message';

  return (
    <View style={styles.row}>
      {showFriendBtn && (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            friendIsOutline ? styles.btnOutline : styles.btnPrimary,
            pressed && !friendIsDisabled && { opacity: 0.8 },
            mutating && { opacity: 0.5 },
          ]}
          onPress={handleFriendPress}
          disabled={friendIsDisabled}
        >
          {mutating ? (
            <ActivityIndicator size="small" color={friendIsOutline ? '#111827' : '#fff'} />
          ) : (
            <Text style={[styles.btnText, friendIsOutline && styles.btnTextOutline]}>
              {friendLabel}
            </Text>
          )}
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          isFriends ? styles.btnDark : styles.btnDarkOutline,
          pressed && !msgSubmitting && { opacity: 0.8 },
          msgSubmitting && { opacity: 0.5 },
        ]}
        onPress={handleMessagePress}
        disabled={msgSubmitting}
      >
        {msgSubmitting ? (
          <ActivityIndicator size="small" color="#1a1a1a" />
        ) : (
          <Text style={[styles.btnText, !isFriends && styles.btnTextDark]}>
            {msgLabel}
          </Text>
        )}
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
