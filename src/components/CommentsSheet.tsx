import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchComments, addComment, editComment, deleteComment } from '../lib/comments';
import CommentRow from './CommentRow';
import styles from '../styles/commentsStyles';

type Props = {
  galleryId: string;
  visible: boolean;
  onClose: () => void;
  highlightUserId?: string;
};

export default function CommentsSheet({ galleryId, visible, onClose, highlightUserId }: Props) {
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';
  const [comments, setComments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [editingComment, setEditingComment] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [replyRefreshKey, setReplyRefreshKey] = useState(0);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(highlightUserId ?? null);
  const inputRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    const data = await fetchComments(galleryId);
    setComments(data);
  };

  useEffect(() => {
    if (visible) load();
  }, [visible, galleryId]);

  useEffect(() => {
    if (activeHighlightId && comments.length > 0) {
      const index = comments.findIndex(c => c.user_id === activeHighlightId);
      if (index >= 0) {
        setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true }), 400);
      }
    }
  }, [activeHighlightId, comments]);

  useEffect(() => {
    if (!visible) setActiveHighlightId(null);
  }, [visible]);

  useEffect(() => {
    if (highlightUserId) setActiveHighlightId(highlightUserId);
  }, [highlightUserId]);

  useEffect(() => {
    setText(editingComment ? (editingComment.content ?? '') : '');
  }, [editingComment]);

  useEffect(() => {
    if (replyingTo) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [replyingTo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!text.trim() || !currentUserId) return;
    try {
      if (editingComment) {
        await editComment(editingComment.id, text.trim());
        setComments(prev => prev.map(c => c.id === editingComment.id ? { ...c, content: text.trim(), edited: true } : c));
        setEditingComment(null);
      } else if (replyingTo) {
        await addComment(galleryId, currentUserId, text.trim(), replyingTo.id);
        setReplyRefreshKey(k => k + 1);
        setExpandedCommentId(replyingTo.id);
        setReplyingTo(null);
      } else {
        const newComment = await addComment(galleryId, currentUserId, text.trim());
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', currentUserId)
          .single();
        setComments(prev => [...prev, { ...newComment, profile: profile ?? null }]);
      }
      setText('');
    } catch (e) {
      console.error('handleSend error:', e);
      Alert.alert('Error', 'Could not post comment. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={c => c.id}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: item.user_id === activeHighlightId ? '#fff5f5' : 'transparent' }}>
              <CommentRow
                comment={item}
                currentUserId={currentUserId}
                onEdit={setEditingComment}
                onReply={(comment) => {
                  setReplyingTo(comment);
                  setText('@' + (comment.profile?.username ?? '') + ' ');
                }}
                refreshKey={replyRefreshKey}
                expandedCommentId={expandedCommentId}
                onDelete={async (c) => {
                  await deleteComment(c.id);
                  setComments(prev => prev.filter(x => x.id !== c.id));
                }}
              />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to comment</Text>
              </View>
            }
          />
          <View>
            {editingComment && (
              <View style={styles.editBanner}>
                <Text style={styles.editLabel}>Editing comment</Text>
                <Pressable onPress={() => setEditingComment(null)} hitSlop={8}>
                  <Text style={styles.editClose}>✕</Text>
                </Pressable>
              </View>
            )}
            {replyingTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Replying to {replyingTo.profile?.username ?? 'comment'}</Text>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
                </Pressable>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff', minHeight: 70, gap: 10 }}>
              <TextInput
                ref={inputRef}
                style={{ flex: 1, fontSize: 15, color: '#111827', backgroundColor: '#f3f4f6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 120, minHeight: 46 }}
                value={text}
                onChangeText={setText}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                multiline
                returnKeyType="default"
              />
              <Pressable
                style={[{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' }, !text.trim() && { backgroundColor: '#e5e7eb' }]}
                onPress={handleSend}
                disabled={!text.trim()}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            </View>
          </View>
          </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
