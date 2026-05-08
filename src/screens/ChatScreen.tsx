import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchMessages, sendMessage, editMessage, deleteMessage, sendImageMessage } from '../lib/messages';
import type { Message } from '../lib/messages';
import MessageBubble from '../components/MessageBubble';
import MessageInputBar from '../components/MessageInputBar';
import { supabase } from '../lib/supabase';
import styles from '../styles/chatStyles';

type RouteParams = { conversationId: string; otherUserId: string; otherUsername: string };

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
    supabase.from('profiles').select('avatar_url, username, display_name').eq('id', otherUserId).single()
      .then(({ data }) => {
        setOtherAvatar(data?.avatar_url ?? null);
        setOtherUsername(data?.display_name || data?.username || otherUsername);
      });

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
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#FF6B6B" />
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
            } else {
              const msg = await sendMessage(conversationId, currentUserId, text);
              setMessages(prev => [...prev, msg]);
            }
          }}
          onSendImage={async (uri) => {
            const msg = await sendImageMessage(conversationId, currentUserId, uri);
            setMessages(prev => [...prev, msg]);
          }}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
