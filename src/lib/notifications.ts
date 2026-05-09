import { supabase } from './supabase';

export type NotificationType =
  | 'comment'
  | 'gallery_photo_added'
  | 'friend_request'
  | 'friend_accepted'
  | 'message'
  | 'gallery_invite'
  | 'removal_request'
  | 'trusted_friend';

export function getNotificationIcon(type: NotificationType | string | null): { name: string; color: string } {
  switch (type) {
    case 'comment':             return { name: 'chatbubble',    color: '#FF6B6B' };
    case 'gallery_photo_added': return { name: 'heart',         color: '#FF6B6B' };
    case 'friend_request':      return { name: 'person-add',    color: '#3b82f6' };
    case 'friend_accepted':     return { name: 'people',        color: '#10b981' };
    case 'message':             return { name: 'mail',          color: '#FF6B6B' };
    case 'gallery_invite':      return { name: 'images',        color: '#8B5CF6' };
    case 'removal_request':     return { name: 'flag',          color: '#F59E0B' };
    case 'trusted_friend':      return { name: 'star',          color: '#F59E0B' };
    default:                    return { name: 'notifications',  color: '#9ca3af' };
  }
}

export function getNotificationLabel(type: NotificationType | string | null): string {
  switch (type) {
    case 'comment':             return 'Comment';
    case 'gallery_photo_added': return 'New Photo';
    case 'friend_request':      return 'Friend Request';
    case 'friend_accepted':     return 'Friend Accepted';
    case 'message':             return 'Message';
    case 'gallery_invite':      return 'Gallery Invite';
    case 'removal_request':     return 'Removal Request';
    case 'trusted_friend':      return 'Trusted Friend';
    default:                    return 'Notification';
  }
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);

  return !error;
}

export async function markOneRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  return !error;
}

export async function markNotificationUnread(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: false })
    .eq('id', notificationId);

  return !error;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  return !error;
}
