import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canEditComment } from '../lib/comments';
import CommentReplies from './CommentReplies';

type Comment = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  edited?: boolean;
  gallery_id?: string;
  reply_count?: number;
  profile: { username: string; avatar_url?: string | null } | null;
};

type Props = {
  comment: Comment;
  currentUserId: string;
  onEdit: (comment: any) => void;
  onDelete: (comment: any) => void;
  onReply: (comment: any) => void;
  refreshKey?: number;
  expandedCommentId?: string | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

export default function CommentRow({ comment, currentUserId, onEdit, onDelete, onReply, refreshKey, expandedCommentId }: Props) {
  const isOwn = comment.user_id === currentUserId;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
    <Pressable onLongPress={isOwn ? () => setShowMenu(true) : undefined} style={{ position: 'relative' }}>
      {showMenu && (
        <>
          <TouchableOpacity style={styles.overlay} onPress={() => setShowMenu(false)} activeOpacity={1} />
          <View style={styles.menu}>
            {canEditComment(comment.created_at) && (
              <>
                <Pressable style={styles.menuRow} onPress={() => { onEdit(comment); setShowMenu(false); }}>
                  <Ionicons name="pencil-outline" size={15} color="#fff" />
                  <Text style={styles.menuTextWhite}>Edit</Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            )}
            <Pressable style={styles.menuRow} onPress={() => { onDelete(comment); setShowMenu(false); }}>
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
              <Text style={styles.menuTextRed}>Delete</Text>
            </Pressable>
          </View>
        </>
      )}
      <View style={styles.row}>
        {comment.profile?.avatar_url ? (
          <Image source={{ uri: comment.profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{comment.profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={styles.body}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.username}>{comment.profile?.username ?? 'Unknown'}</Text>
            {comment.user_id === currentUserId && (
              <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '400' }}> (You)</Text>
            )}
          </View>
          <Text style={styles.content}>{comment.content}</Text>
          {comment.edited && <Text style={styles.edited}>edited</Text>}
          <Pressable onPress={() => onReply(comment)} style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>Reply</Text>
          </Pressable>
        </View>
        <Text style={styles.time}>{relativeTime(comment.created_at)}</Text>
      </View>
    </Pressable>
    <CommentReplies
      parentId={comment.id}
      replyCount={comment.reply_count ?? 0}
      galleryId={comment.gallery_id ?? ''}
      currentUserId={currentUserId}
      onReplyEdit={onEdit}
      onReplyDelete={(commentId) => onDelete({ ...comment, id: commentId })}
      refreshKey={refreshKey}
      forceExpanded={expandedCommentId === comment.id}
    />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700', color: '#9ca3af', fontSize: 14 },
  body: { flex: 1 },
  username: { fontWeight: '700', fontSize: 13, color: '#111827', marginBottom: 2 },
  content: { fontSize: 14, color: '#111827' },
  edited: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  overlay: { position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999, zIndex: 998, backgroundColor: 'transparent' },
  menu: { position: 'absolute', bottom: '100%', right: 14, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 4, zIndex: 1000, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  menuTextWhite: { color: '#fff', fontSize: 14, fontWeight: '500' },
  menuTextRed: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 8 },
});
