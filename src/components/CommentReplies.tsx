import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchReplies } from '../lib/comments';
import CommentRow from './CommentRow';

type Props = {
  parentId: string;
  replyCount: number;
  galleryId: string;
  currentUserId: string;
  onReplyEdit: (comment: any) => void;
  onReplyDelete: (commentId: string) => void;
  onReply: (comment: any) => void;
  refreshKey?: number;
  forceExpanded?: boolean;
};

export default function CommentReplies({ parentId, replyCount, galleryId, currentUserId, onReplyEdit, onReplyDelete, onReply, refreshKey, forceExpanded }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  useEffect(() => {
    if (expanded) {
      setLoading(true);
      fetchReplies(parentId).then(data => {
        setReplies(data);
        setLoading(false);
      });
    }
  }, [expanded, parentId, refreshKey]);

  useEffect(() => {
    if (expanded) {
      fetchReplies(parentId).then(setReplies);
    }
  }, [refreshKey]);

  if (!expanded && replyCount === 0) return null;

  if (!expanded) {
    return (
      <Pressable style={styles.toggleRow} onPress={() => setExpanded(true)}>
        <Ionicons name="chevron-down" size={14} color="#9ca3af" />
        <Text style={styles.toggleText}>View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable style={styles.toggleRow} onPress={() => setExpanded(false)}>
        <Ionicons name="chevron-up" size={14} color="#9ca3af" />
        <Text style={styles.toggleText}>Collapse</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator size="small" color="#9ca3af" style={{ marginLeft: 32, marginVertical: 8 }} />
      ) : (
        replies.map(reply => (
          <View key={reply.id} style={styles.replyIndent}>
            <CommentRow
              comment={reply}
              currentUserId={currentUserId}
              onEdit={onReplyEdit}
              onDelete={() => onReplyDelete(reply.id)}
              onReply={onReply}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 32, marginVertical: 6 },
  toggleText: { fontSize: 13, color: '#9ca3af' },
  replyIndent: { marginLeft: 32 },
});
