import { supabase } from './supabase';
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
    .eq('user_id', userId);

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

  return [
    ...(owned ?? []).map((g) => ({ ...g, role: 'owner' as const })),
    ...invited,
  ];
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
}: {
  galleryId: string;
  uri: string;
  mimeType?: string;
}): Promise<void> {
  console.log('[upload] starting for gallery', galleryId, 'uri', uri);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[upload] session user id', session?.user.id, 'session error', sessionError);
  if (!session) throw new Error('Not signed in');

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  console.log('[upload] arrayBuffer byteLength', arrayBuffer.byteLength);

  const contentType = mimeType || 'image/jpeg';
  const ext = contentType.startsWith('image/') ? (contentType.split('/')[1] ?? 'jpg') : 'jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${galleryId}/${filename}`;
  console.log('[upload] storage path', storagePath, 'contentType', contentType);

  // StorageClient has no setAuth method in storage-js v2.x — use setHeader instead.
  // This also guards against the startup race where onAuthStateChange hasn't fired
  // yet to update the storage auth header from the anon key to the session token.
  const { data: storageData, error: uploadError } = await supabase.storage
    .setHeader('Authorization', `Bearer ${session.access_token}`)
    .from('gallery-photos')
    .upload(storagePath, arrayBuffer, { contentType, upsert: false });
  console.log('[upload] storage result data', storageData, 'error', uploadError);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('gallery-photos')
    .getPublicUrl(storagePath);
  console.log('[upload] public url', urlData.publicUrl);

  const insertPayload = {
    gallery_id: galleryId,
    storage_path: storagePath,
    url: urlData.publicUrl,
    uploaded_by: session.user.id,
  };
  console.log('[upload] inserting row', JSON.stringify(insertPayload));

  const { data: insertData, error: dbError } = await supabase
    .from('gallery_photos')
    .insert(insertPayload)
    .select();
  console.log('[upload] insert result data', insertData, 'error', dbError);

  if (dbError) throw dbError;
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
    .insert({ gallery_id: galleryId, user_id: data.id, role: 'member' });

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
