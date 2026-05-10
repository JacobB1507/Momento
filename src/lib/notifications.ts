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

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType | string;
  related_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  gallery_cover_photo_url?: string | null;
  gallery_title?: string | null;
  gallery_contributor_count?: number;
  [key: string]: any;
};

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  const notifications: Notification[] = data ?? [];

  const galleryIds = notifications
    .filter(n => n.type === 'gallery_invite' && n.related_id)
    .map(n => n.related_id as string);

  if (galleryIds.length === 0) return notifications;

  const [galleriesRes, membersRes] = await Promise.all([
    supabase.from('galleries').select('id, title, cover_photo_url').in('id', galleryIds),
    supabase.from('gallery_members').select('gallery_id').in('gallery_id', galleryIds),
  ]);

  const galleryMap = Object.fromEntries(
    (galleriesRes.data ?? []).map(g => [g.id, g])
  );
  const contributorCounts: Record<string, number> = {};
  for (const row of membersRes.data ?? []) {
    contributorCounts[row.gallery_id] = (contributorCounts[row.gallery_id] ?? 0) + 1;
  }

  return notifications.map(n => {
    if (n.type !== 'gallery_invite' || !n.related_id) return n;
    const gallery = galleryMap[n.related_id];
    return {
      ...n,
      gallery_cover_photo_url: gallery?.cover_photo_url ?? null,
      gallery_title: gallery?.title ?? null,
      gallery_contributor_count: contributorCounts[n.related_id] ?? 0,
    };
  });
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

export type NotificationPreferences = {
  friend_request: boolean;
  friend_accepted: boolean;
  gallery_invite: boolean;
  gallery_photo_added: boolean;
  comment: boolean;
  comment_reply: boolean;
  removal_request: boolean;
  removal_vote: boolean;
  message: boolean;
  message_request: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  friend_request: true,
  friend_accepted: true,
  gallery_invite: true,
  gallery_photo_added: true,
  comment: true,
  comment_reply: true,
  removal_request: true,
  removal_vote: true,
  message: true,
  message_request: true,
};

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();
  if (error || !data?.notification_preferences) return DEFAULT_PREFS;
  return { ...DEFAULT_PREFS, ...data.notification_preferences };
}

export async function updateNotificationPreference(
  userId: string,
  key: keyof NotificationPreferences,
  value: boolean
): Promise<void> {
  const current = await getNotificationPreferences(userId);
  const next = { ...current, [key]: value };
  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: next })
    .eq('id', userId);
  if (error) throw error;
}
