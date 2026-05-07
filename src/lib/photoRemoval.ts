import { supabase } from './supabase';

export async function deleteOwnPhoto(photoId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', photoId);
  return !error;
}

export async function requestPhotoRemoval(
  photoId: string,
  galleryId: string,
  requestedBy: string,
  reason: string,
): Promise<'ok' | 'already_requested' | 'error'> {
  const { data: existing } = await supabase
    .from('photo_removal_requests')
    .select('id')
    .eq('photo_id', photoId)
    .eq('requested_by', requestedBy)
    .maybeSingle();

  if (existing) return 'already_requested';

  const { error } = await supabase
    .from('photo_removal_requests')
    .insert({ photo_id: photoId, gallery_id: galleryId, requested_by: requestedBy, reason });

  return error ? 'error' : 'ok';
}

export async function getRemovalRequests(galleryId: string) {
  const { data: requests, error } = await supabase
    .from('photo_removal_requests')
    .select('id, photo_id, reason, requested_by, created_at')
    .eq('gallery_id', galleryId);

  if (error || !requests) return [];

  const requestorIds = [...new Set(requests.map((r) => r.requested_by))];
  const requestIds = requests.map((r) => r.id);

  const [{ data: profiles }, { data: votes }] = await Promise.all([
    supabase.from('profiles').select('id, username').in('id', requestorIds),
    supabase.from('photo_removal_votes').select('request_id, vote').in('request_id', requestIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));
  const voteMap = new Map<string, { yes: number; no: number }>();
  for (const v of votes ?? []) {
    const entry = voteMap.get(v.request_id) ?? { yes: 0, no: 0 };
    if (v.vote) entry.yes += 1;
    else entry.no += 1;
    voteMap.set(v.request_id, entry);
  }

  return requests.map((r) => ({
    id: r.id,
    photo_id: r.photo_id,
    reason: r.reason,
    requested_by_username: (profileMap.get(r.requested_by) as string | null) ?? null,
    yes_votes: voteMap.get(r.id)?.yes ?? 0,
    no_votes: voteMap.get(r.id)?.no ?? 0,
    created_at: r.created_at,
  }));
}

export async function voteOnRemoval(
  requestId: string,
  userId: string,
  vote: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('photo_removal_votes')
    .insert({ request_id: requestId, user_id: userId, vote });
  return !error;
}
