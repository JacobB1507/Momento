import { supabase } from './supabase';

export type FeedPhoto = {
  id: string;
  url: string;
  created_at: string;
  gallery_id: string;
  gallery_title: string;
  uploaded_by: string;
  uploader_username: string | null;
  uploader_avatar_url: string | null;
};

export type FeedGallery = {
  id: string;
  title: string;
  cover_photo_url: string | null;
  created_by: string;
  created_at: string;
  privacy: string;
  username: string | null;
  avatar_url: string | null;
};

async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error || !data || data.length === 0) return [];
  return data.map(row => (row.sender_id === userId ? row.receiver_id : row.sender_id));
}

export async function getFeedPhotos(userId: string, limit = 30): Promise<FeedPhoto[]> {
  try {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return [];

    const { data: memberships, error: memberError } = await supabase
      .from('gallery_members')
      .select('gallery_id')
      .in('user_id', friendIds);

    if (memberError || !memberships || memberships.length === 0) return [];

    const galleryIds = [...new Set(memberships.map(m => m.gallery_id))];

    const { data, error } = await supabase
      .from('gallery_photos')
      .select('id, url, created_at, gallery_id, uploaded_by, profiles(username, avatar_url), galleries(title)')
      .in('gallery_id', galleryIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      url: row.url,
      created_at: row.created_at,
      gallery_id: row.gallery_id,
      gallery_title: row.galleries?.title ?? '',
      uploaded_by: row.uploaded_by,
      uploader_username: row.profiles?.username ?? null,
      uploader_avatar_url: row.profiles?.avatar_url ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getFeedGalleries(userId: string) {
  const { data: friendRows } = await supabase
    .from('friends')
    .select('sender_id, receiver_id')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (!friendRows || friendRows.length === 0) return [];

  const friendIds = friendRows.map(row =>
    row.sender_id === userId ? row.receiver_id : row.sender_id
  );

  const { data: galleries } = await supabase
    .from('galleries')
    .select('*')
    .in('created_by', friendIds)
    .order('created_at', { ascending: false })
    .limit(20);

  return galleries ?? [];
}
