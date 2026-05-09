import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchMessages, sendMessage, editMessage, deleteMessage, sendImageMessage, requestMessagePermission, clearConversationForUser } from '../lib/messages';
import { getMutualFriends } from '../lib/friends';
import type { Message } from '../lib/messages';
import MessageBubble from '../components/MessageBubble';
import MessageInputBar from '../components/MessageInputBar';
import { supabase } from '../lib/supabase';
import styles from '../styles/chatStyles';

type RouteParams = { conversationId: string; otherUserId: string; otherUsername: string; isPendingRequest?: boolean };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Chat: RouteParams }, 'Chat'>>();
  const { conversationId, otherUserId } = route.params;
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState<string>(route.params.otherUsername ?? '');
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [otherUsernameHandle, setOtherUsernameHandle] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isPending, setIsPending] = useState(route.params?.isPendingRequest ?? false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const load = useCallback(async () => {
    const data = await fetchMessages(conversationId);
    setMessages(data);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [conversationId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    (async () => {
      const { data } = await supabase.from('profiles').select('avatar_url, username, display_name').eq('id', otherUserId).single();
      setOtherAvatar(data?.avatar_url ?? null);
      setOtherUsername(data?.display_name || data?.username || otherUsername);
      setOtherUsernameHandle(data?.username ?? '');
      const m = await getMutualFriends(currentUserId, otherUserId);
      setMutuals(m);
      const { data: existingRequest } = await supabase
        .from('message_requests')
        .select('id, status')
        .eq('requester_id', currentUserId)
        .eq('target_user_id', otherUserId)
        .eq('status', 'pending')
        .maybeSingle();
      if (existingRequest) setRequestSent(true);
    })();
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchMessages(conversationId);
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff', gap: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('FriendProfile', { userId: otherUserId, username: otherUsername })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          {otherAvatar
            ? <Image source={{ uri: otherAvatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#9ca3af' }}>{otherUsername?.[0]?.toUpperCase()}</Text>
              </View>
          }
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{otherUsername}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowChatMenu(v => !v)} hitSlop={12} style={{ marginLeft: 'auto' }}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </TouchableOpacity>
      </View>
      {showChatMenu && (
        <>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} onPress={() => setShowChatMenu(false)} />
          <View style={{ position: 'absolute', top: 56, right: 12, backgroundColor: '#1a1a1a', borderRadius: 12, zIndex: 999, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 }}>
            <Pressable
              style={{ paddingHorizontal: 16, paddingVertical: 12 }}
              onPress={() => {
                setShowChatMenu(false);
                Alert.alert(
                  'Clear Conversation',
                  'Remove this conversation from your view?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await clearConversationForUser(conversationId, currentUserId);
                        navigation.goBack();
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '500' }}>Clear Conversation</Text>
            </Pressable>
          </View>
        </>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#FF6B6B" />
        ) : !loading && messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
            {otherAvatar
              ? <Image source={{ uri: otherAvatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              : <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#9ca3af' }}>{otherUsername?.[0]?.toUpperCase()}</Text>
                </View>
            }
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>{otherUsername}</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: -8 }}>@{otherUsernameHandle}</Text>
            {mutuals.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                {mutuals.slice(0, 3).map(m => (
                  <Image key={m.id} source={{ uri: m.avatar_url }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                ))}
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  {mutuals.length} mutual friend{mutuals.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>Say hi! Start the conversation 👋</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={m => m.id}
            renderItem={({ item, index }) => (
              <View style={{ opacity: editingMessage && item.id !== editingMessage.id ? 0.25 : 1 }}>
                <MessageBubble
                  message={item}
                  currentUserId={currentUserId}
                  isLast={index === messages.length - 1}
                  onEdit={(msg) => setEditingMessage(msg)}
                  onDelete={async (msg) => {
                    await deleteMessage(msg.id);
                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted: true, content: '' } : m));
                    if (requestSent) {
                      await supabase.from('message_requests').delete().eq('requester_id', currentUserId).eq('target_user_id', otherUserId).eq('status', 'pending');
                      setRequestSent(false);
                    }
                  }}
                />
              </View>
            )}
            ref={flatListRef}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
          />
        )}
        <MessageInputBar
          onSend={async (text) => {
            if (editingMessage) {
              await editMessage(editingMessage.id, text);
              setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: text, edited: true } : m));
              setEditingMessage(null);
              if (requestSent) {
                await supabase.from('message_requests').update({ message_preview: text }).eq('requester_id', currentUserId).eq('target_user_id', otherUserId).eq('status', 'pending');
              }
            } else {
              const msg = await sendMessage(conversationId, currentUserId, text);
              setMessages(prev => [...prev, msg]);
              if (isPending && !requestSent) {
                await requestMessagePermission(currentUserId, otherUserId, text);
                setRequestSent(true);
                setIsPending(false);
              }
            }
          }}
          onSendImage={async (uri) => {
            const msg = await sendImageMessage(conversationId, currentUserId, uri);
            setMessages(prev => [...prev, msg]);
          }}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          disabled={requestSent}
        />
        {requestSent && (
          <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              Your message request has been sent. {otherUsername} must accept before you can continue chatting.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
