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

function describeAvatarError(label: string, e: unknown): string {
  try {
    const anyE = e as any;
    const parts: string[] = [label];
    if (anyE?.name) parts.push(`name=${anyE.name}`);
    if (anyE?.statusCode) parts.push(`statusCode=${anyE.statusCode}`);
    if (anyE?.status) parts.push(`status=${anyE.status}`);
    if (anyE?.error) parts.push(`error=${anyE.error}`);
    if (anyE?.message) parts.push(`message=${anyE.message}`);
    if (anyE && typeof anyE === 'object' && !anyE.message && !anyE.error) {
      try { parts.push(`raw=${JSON.stringify(anyE).slice(0, 200)}`); } catch {}
    }
    return parts.join(' | ');
  } catch {
    return (e as any)?.message ?? 'Avatar upload failed (unknown error).';
  }
}

export async function uploadAvatarFile({ uri, mimeType }: {
  uri: string;
  mimeType?: string;
}): Promise<{ publicUrl: string; displayUrl: string }> {
  let stage = 'init';
  try {
    stage = 'refreshSession';
    console.log('[uploadAvatarFile] entering stage:', stage);
    await supabase.auth.refreshSession().catch(() => {});

    stage = 'getSession';
    console.log('[uploadAvatarFile] entering stage:', stage);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    console.log('[uploadAvatarFile] hasSession = true tokenLen =', session.access_token.length);

    const contentType = mimeType || 'image/jpeg';

    stage = 'fetchImage';
    console.log('[uploadAvatarFile] entering stage:', stage);
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);

    stage = 'arrayBuffer';
    console.log('[uploadAvatarFile] entering stage:', stage);
    const arrayBuffer = await response.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    console.log('[uploadAvatarFile] byteLength =', byteLength);
    if (byteLength === 0) throw new Error('Avatar arrayBuffer is empty');

    stage = 'callEdgeFunction';
    console.log('[uploadAvatarFile] entering stage:', stage);
    const supabaseUrl = (supabase as any).supabaseUrl
      ?? (supabase as any).storageUrl?.replace('/storage/v1', '')
      ?? '';
    if (!supabaseUrl) throw new Error('Could not derive supabase url');

    const endpoint = `${supabaseUrl}/functions/v1/upload-avatar`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': contentType,
        'x-mime-type': contentType,
      },
      body: arrayBuffer,
    });

    stage = 'parseResponse';
    console.log('[uploadAvatarFile] entering stage:', stage, 'status:', res.status);
    const json = await res.json().catch(() => ({ error: 'invalid_json' }));

    if (!res.ok || !json?.ok) {
      console.log('[uploadAvatarFile] edge function error:', JSON.stringify(json));
      const msg = (json && (json.detail || json.error)) || `HTTP ${res.status}`;
      throw new Error(`Avatar upload failed: ${msg}`);
    }

    const publicUrl: string = json.publicUrl;
    const displayUrl = `${publicUrl}?t=${Date.now()}`;
    console.log('[uploadAvatarFile] SUCCESS publicUrl =', publicUrl);

    return { publicUrl, displayUrl };
  } catch (e: any) {
    console.log('[uploadAvatarFile] ERROR stage:', stage, 'message:', e?.message);
    throw e;
  }
}

export async function setProfileAvatarUrl(userId: string, publicUrlWithoutCacheBust: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlWithoutCacheBust })
      .eq('id', userId);
    if (error) throw error;
  } catch (e) {
    reportError(`setProfileAvatarUrl failed | ${(e as any)?.message ?? 'no message'} | code=${(e as any)?.code ?? 'none'}`);
    throw e;
  }
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
