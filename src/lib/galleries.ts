import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { reportError } from './errorReport';
import type { Gallery, Photo } from '../types/database';

export async function fetchUserGalleries(userId: string): Promise<Gallery[]> {
  const { data: owned, error: ownedError } = await supabase
    .from('galleries')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (ownedError) throw ownedError;

  const { data: memberships, error: memberError } = await supabase
    .from('gallery_members')
    .select('gallery_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (memberError) throw memberError;

  const invitedIds = (memberships ?? []).map((m) => m.gallery_id);

  let invited: Gallery[] = [];
  if (invitedIds.length > 0) {
    const { data, error } = await supabase
      .from('galleries')
      .select('*')
      .in('id', invitedIds)
      .neq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    invited = (data ?? []).map((g) => ({ ...g, role: 'member' as const }));
  }

  const all = [
    ...(owned ?? []).map((g) => ({ ...g, role: 'owner' as const })),
    ...invited,
  ];
  all.sort((a, b) => {
    if (a.pinned === b.pinned) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.pinned ? -1 : 1;
  });
  return all;
}

export async function fetchGalleryPhotos(galleryId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function uploadGalleryPhoto({
  galleryId,
  uri,
  mimeType,
  width,
  height,
  onProgress,
}: {
  galleryId: string;
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
}): Promise<void> {
  if (mimeType && !mimeType.startsWith('image/')) throw new Error('Only image files are supported.');

  const MAX_DIM = 2048;
  const actions: Array<{ resize: { width?: number; height?: number } }> = [];
  if (width && height) {
    const longer = Math.max(width, height);
    if (longer > MAX_DIM) {
      const scale = MAX_DIM / longer;
      actions.push({ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } });
    }
  } else {
    actions.push({ resize: { width: MAX_DIM } });
  }
  const compressed = await ImageManipulator.manipulateAsync(
    uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // StorageClient has no setAuth method in storage-js v2.x — use setHeader instead.
  // This also guards against the startup race where onAuthStateChange hasn't fired
  // yet to update the storage auth header from the anon key to the session token.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();

  const storagePath = `${galleryId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error: uploadError } = await supabase.storage
    .setHeader('Authorization', `Bearer ${session.access_token}`)
    .from('gallery-photos')
    .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('gallery-photos').getPublicUrl(storagePath);
  const { error: dbError } = await supabase
    .from('gallery_photos')
    .insert({ gallery_id: galleryId, storage_path: storagePath, url: urlData.publicUrl, uploaded_by: session.user.id });
  if (dbError) throw dbError;

  onProgress?.(1, 1);

  try {
    const { data: galleryData } = await supabase
      .from('galleries')
      .select('cover_photo_url')
      .eq('id', galleryId)
      .single();
    if (galleryData && galleryData.cover_photo_url === null) {
      await supabase
        .from('galleries')
        .update({ cover_photo_url: urlData.publicUrl })
        .eq('id', galleryId);
    }
  } catch (coverErr) {
    reportError('uploadGalleryPhoto.autoSetCover', coverErr);
  }
}

export async function uploadAvatarFile({ uri, mimeType }: {
  uri: string;
  mimeType?: string;
}): Promise<{ publicUrl: string; displayUrl: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error('Not signed in');

  const userId = session.user.id;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const contentType = mimeType || 'image/jpeg';
  const ext = contentType.startsWith('image/')
    ? (contentType.split('/')[1] ?? 'jpg')
    : 'jpg';
  const storagePath = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { error: uploadError } = await supabase.storage
    .setHeader('Authorization', `Bearer ${session.access_token}`)
    .from('avatars')
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(storagePath);

  return { publicUrl: urlData.publicUrl, displayUrl: `${urlData.publicUrl}?t=${Date.now()}` };
}

export async function setProfileAvatarUrl(userId: string, publicUrlWithoutCacheBust: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrlWithoutCacheBust })
    .eq('id', userId);
  if (error) throw error;
}

export async function inviteUserToGallery(galleryId: string, email: string): Promise<'ok' | 'no_account'> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw error;
  if (!data) return 'no_account';

  const { error: insertError } = await supabase
    .from('gallery_members')
    .insert({ gallery_id: galleryId, user_id: data.id, role: 'member', status: 'pending' });

  if (insertError) {
    if (insertError.code === '23505') throw new Error('That person is already a member of this gallery.');
    throw insertError;
  }

  return 'ok';
}

export async function uploadAvatar(userId: string, uri: string): Promise<string | null> {
  try {
    const rawExt = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
    const ext = rawExt || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const storagePath = `${userId}/avatar.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri, name: `avatar.${ext}`, type: mimeType } as unknown as Blob);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, formData, { contentType: mimeType, upsert: true });

    if (uploadError) return null;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (dbError) return null;

    return `${publicUrl}?t=${Date.now()}`;
  } catch {
    return null;
  }
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getDefaultGalleryPrivacy(userId: string): Promise<'private' | 'friends' | 'public'> {
  const { data, error } = await supabase
    .from('profiles')
    .select('default_gallery_privacy')
    .eq('id', userId)
    .single();
  if (error || !data?.default_gallery_privacy) return 'friends';
  return data.default_gallery_privacy as 'private' | 'friends' | 'public';
}

export async function setDefaultGalleryPrivacy(userId: string, privacy: 'private' | 'friends' | 'public'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ default_gallery_privacy: privacy })
    .eq('id', userId);
  if (error) throw error;
}

export async function promoteToAdmin(galleryId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gallery_members')
    .update({ role: 'admin' })
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .neq('role', 'owner');
  if (error) throw error;
}

export async function demoteToMember(galleryId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gallery_members')
    .update({ role: 'member' })
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .neq('role', 'owner');
  if (error) throw error;
}

export async function removeMember(galleryId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('gallery_members')
    .delete()
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .neq('role', 'owner');
  if (error) throw error;
}

export async function getGalleryRole(
  galleryId: string,
  userId: string,
): Promise<{ role: 'owner' | 'admin' | 'member' | null; error: any }> {
  const { data, error } = await supabase
    .from('gallery_members')
    .select('role')
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { role: null, error };
  return { role: (data?.role as 'owner' | 'admin' | 'member') ?? null, error: null };
}

export async function acceptGalleryInvite(galleryId: string, userId: string) {
  const { error } = await supabase
    .from('gallery_members')
    .update({ status: 'accepted' })
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .eq('status', 'pending');
  return { error };
}

export async function declineGalleryInvite(galleryId: string, userId: string) {
  const { error } = await supabase
    .from('gallery_members')
    .delete()
    .eq('gallery_id', galleryId)
    .eq('user_id', userId)
    .eq('status', 'pending');
  return { error };
}

export async function transferGalleryOwnership(galleryId: string, newOwnerId: string) {
  const { error } = await supabase.rpc('transfer_gallery_ownership', {
    p_gallery_id: galleryId,
    p_new_owner_id: newOwnerId,
  });
  return { error };
}

export async function verifyCurrentUserPassword(password: string): Promise<{ valid: boolean; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { valid: false, error: new Error('No active session') };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error) return { valid: false, error };
  return { valid: true, error: null };
}
