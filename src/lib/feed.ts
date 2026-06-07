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

export async function getFeedPhotos(userId: string, limit = 30): Promise<{ data: FeedPhoto[]; error: string | null }> {
  try {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return { data: [], error: null };

    const { data: memberships, error: memberError } = await supabase
      .from('gallery_members')
      .select('gallery_id')
      .in('user_id', friendIds);

    if (memberError) return { data: [], error: memberError.message };
    if (!memberships || memberships.length === 0) return { data: [], error: null };

    const galleryIds = [...new Set(memberships.map(m => m.gallery_id))];

    const { data, error } = await supabase
      .from('gallery_photos')
      .select('id, url, created_at, gallery_id, uploaded_by, profiles(username, avatar_url), galleries(title)')
      .in('gallery_id', galleryIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };
    if (!data) return { data: [], error: null };

    return {
      data: data.map((row: any) => ({
        id: row.id,
        url: row.url,
        created_at: row.created_at,
        gallery_id: row.gallery_id,
        gallery_title: row.galleries?.title ?? '',
        uploaded_by: row.uploaded_by,
        uploader_username: row.profiles?.username ?? null,
        uploader_avatar_url: row.profiles?.avatar_url ?? null,
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e?.message ?? 'Unknown error' };
  }
}

export async function getFeedGalleries(userId: string): Promise<{ data: FeedGallery[]; error: string | null }> {
  try {
    const { data: friendRows, error: friendError } = await supabase
      .from('friends')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (friendError) return { data: [], error: friendError.message };
    if (!friendRows || friendRows.length === 0) return { data: [], error: null };

    const friendIds = friendRows.map(row =>
      row.sender_id === userId ? row.receiver_id : row.sender_id
    );

    const { data: galleries, error: galError } = await supabase
      .from('galleries')
      .select('*')
      .in('created_by', friendIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (galError) return { data: [], error: galError.message };
    return { data: galleries ?? [], error: null };
  } catch (e: any) {
    return { data: [], error: e?.message ?? 'Unknown error' };
  }
}
