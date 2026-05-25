import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { canEditComment, canDeleteComment } from '../lib/comments';
import CommentReplies from './CommentReplies';

type Comment = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  edited?: boolean;
  gallery_id?: string;
  reply_count?: number;
  deleted_at?: string | null;
  deleted_by?: string | null;
  profile: { username: string; display_name?: string | null; avatar_url?: string | null } | null;
};

type Props = {
  comment: Comment;
  currentUserId: string;
  galleryOwnerId?: string | null;
  onEdit: (comment: any) => void;
  onDelete: (comment: any) => void;
  onReply: (comment: any) => void;
  refreshKey?: number;
  expandedCommentId?: string | null;
  isReply?: boolean;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

export default function CommentRow({ comment, currentUserId, galleryOwnerId, onEdit, onDelete, onReply, refreshKey, expandedCommentId, isReply }: Props) {
  const isOwn = comment.user_id === currentUserId;
  const [showMenu, setShowMenu] = useState(false);
  const isDeleted = !!comment.deleted_at;

  if (isDeleted) {
    return (
      <>
        <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
          <Text style={{ fontStyle: 'italic', color: '#9ca3af', fontSize: 13 }}>[Comment deleted]</Text>
        </View>
        {!isReply && (
          <CommentReplies
            parentId={comment.id}
            replyCount={comment.reply_count ?? 0}
            galleryId={comment.gallery_id ?? ''}
            currentUserId={currentUserId}
            onReplyEdit={onEdit}
            onReplyDelete={(commentId) => onDelete({ ...comment, id: commentId })}
            onReply={onReply}
            refreshKey={refreshKey}
            forceExpanded={expandedCommentId === comment.id}
            renderComment={(reply, isReply) => (
              <CommentRow
                comment={reply}
                isReply={isReply}
                currentUserId={currentUserId}
                galleryOwnerId={galleryOwnerId}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                refreshKey={refreshKey}
                expandedCommentId={expandedCommentId}
              />
            )}
          />
        )}
      </>
    );
  }

  return (
    <>
    <Pressable
      onLongPress={() => {
        if (canDeleteComment(comment, currentUserId, galleryOwnerId ?? undefined)) {
          setShowMenu(true);
        }
      }}
      delayLongPress={300}
      style={[{ position: 'relative' }, showMenu && { zIndex: 9998, elevation: 23 }]}
    >
      {showMenu && (
        <>
          <TouchableOpacity style={styles.overlay} onPress={() => setShowMenu(false)} activeOpacity={1} />
          <View style={styles.menu}>
            {isOwn && canEditComment(comment.created_at) && (
              <>
                <Pressable style={styles.menuRow} onPress={() => { onEdit(comment); setShowMenu(false); }}>
                  <Ionicons name="pencil-outline" size={15} color="#fff" />
                  <Text style={styles.menuTextWhite}>Edit</Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            )}
            {canDeleteComment(comment, currentUserId, galleryOwnerId ?? undefined) && (
              <Pressable style={styles.menuRow} onPress={() => { onDelete(comment); setShowMenu(false); }}>
                <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                <Text style={styles.menuTextRed}>Delete</Text>
              </Pressable>
            )}
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
            <Text style={styles.username}>{comment.profile?.display_name || comment.profile?.username || 'Unknown'}</Text>
            {comment.user_id === currentUserId && (
              <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '400' }}> (You)</Text>
            )}
          </View>
          <Text style={styles.content}>{comment.content}</Text>
          {comment.edited && <Text style={styles.edited}>edited</Text>}
          <Pressable onPress={() => onReply(comment)} style={{ marginTop: 4 }} delayLongPress={1000}>
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
      onReply={onReply}
      refreshKey={refreshKey}
      forceExpanded={expandedCommentId === comment.id}
      renderComment={(reply, isReply) => (
        <CommentRow
          comment={reply}
          isReply={isReply}
          currentUserId={currentUserId}
          galleryOwnerId={galleryOwnerId}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
          refreshKey={refreshKey}
          expandedCommentId={expandedCommentId}
        />
      )}
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
  overlay: { position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999, zIndex: 50, backgroundColor: 'transparent' },
  menu: { position: 'absolute', top: '100%', left: 12, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 4, zIndex: 9999, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 24 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  menuTextWhite: { color: '#fff', fontSize: 14, fontWeight: '500' },
  menuTextRed: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#333', marginHorizontal: 8 },
});
