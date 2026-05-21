import { supabase } from './supabase';

export type ProfileTag = {
  id: string;
  user_id: string;
  label: string;
  color: string;
  emoji: string | null;
  sort_order: number;
  created_at: string;
};

export type GalleryTagApplication = {
  gallery_id: string;
  tag_id: string;
  applied_at: string;
};

export type GalleryTagInfo = {
  gallery_id: string;
  tag_id: string;
  label: string;
  color: string;
  emoji: string | null;
  sort_order: number;
};

export const TAG_PALETTE: readonly string[] = [
  '#FF6B6B',
  '#5B7FFF',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#00C7BE',
  '#FFCC00',
  '#8E8E93',
];

export const MAX_TAGS_PER_USER = 10;

const UUID_RE = /^[a-zA-Z0-9-]+$/;

function validateId(id: string, name = 'id'): void {
  if (!id || !UUID_RE.test(id)) throw new Error(`Invalid ${name}`);
}

function validateLabel(raw: string): string {
  // Strip control characters before validation
  const stripped = raw.replace(/[\x00-\x1F]/g, '');
  const label = stripped.trim();
  if (!label || label.length > 30) throw new Error('Invalid label');
  return label;
}

function validateColor(color: string): void {
  if (!TAG_PALETTE.includes(color)) throw new Error('Invalid color');
}

function validateEmoji(emoji: string): void {
  if (!emoji || emoji.length < 1 || emoji.length > 8) throw new Error('Invalid emoji');
}

function handleTagError(error: unknown): never {
  const err = error as { code?: string; message?: string };
  if (err.code === '23505') throw new Error('You already have a tag with that name.');
  if (err.message && /up to 10 tags/i.test(err.message))
    throw new Error('You can only create up to 10 tags. Delete an existing tag first.');
  throw error;
}

export async function getMyTags(currentUserId: string): Promise<ProfileTag[]> {
  validateId(currentUserId, 'currentUserId');
  const { data, error } = await supabase
    .from('profile_tags')
    .select('*')
    .eq('user_id', currentUserId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch tags: ${error.message}`);
  return data ?? [];
}

export async function getTagsForUser(userId: string): Promise<ProfileTag[]> {
  validateId(userId, 'userId');
  const { data, error } = await supabase
    .from('profile_tags')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch tags for user: ${error.message}`);
  return data ?? [];
}

export async function createTag(args: {
  userId: string;
  label: string;
  color: string;
  emoji?: string | null;
}): Promise<ProfileTag> {
  validateId(args.userId, 'userId');
  const label = validateLabel(args.label);
  validateColor(args.color);
  if (args.emoji != null) validateEmoji(args.emoji);

  const { data: existing } = await supabase
    .from('profile_tags')
    .select('sort_order')
    .eq('user_id', args.userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing && existing.length > 0 ? existing[0].sort_order : -1;
  const sort_order = maxOrder + 1;

  const { data, error } = await supabase
    .from('profile_tags')
    .insert({ user_id: args.userId, label, color: args.color, emoji: args.emoji ?? null, sort_order })
    .select()
    .single();

  if (error) handleTagError(error);
  return data as ProfileTag;
}

export async function updateTag(args: {
  tagId: string;
  label?: string;
  color?: string;
  emoji?: string | null;
}): Promise<ProfileTag> {
  validateId(args.tagId, 'tagId');
  if (args.label === undefined && args.color === undefined && args.emoji === undefined) {
    throw new Error('Nothing to update');
  }

  const updates: Record<string, unknown> = {};
  if (args.label !== undefined) updates.label = validateLabel(args.label);
  if (args.color !== undefined) {
    validateColor(args.color);
    updates.color = args.color;
  }
  if (args.emoji !== undefined) {
    if (args.emoji !== null) validateEmoji(args.emoji);
    updates.emoji = args.emoji;
  }

  const { data, error } = await supabase
    .from('profile_tags')
    .update(updates)
    .eq('id', args.tagId)
    .select()
    .single();

  if (error) handleTagError(error);
  return data as ProfileTag;
}

export async function deleteTag(tagId: string): Promise<void> {
  validateId(tagId, 'tagId');
  const { error } = await supabase.from('profile_tags').delete().eq('id', tagId);
  if (error) throw new Error(`Failed to delete tag: ${error.message}`);
}

export async function reorderTagUp(tagId: string, currentUserId: string): Promise<void> {
  validateId(tagId, 'tagId');
  validateId(currentUserId, 'currentUserId');

  const { data: tagData, error: tagError } = await supabase
    .from('profile_tags')
    .select('sort_order')
    .eq('id', tagId)
    .single();

  if (tagError || !tagData) throw new Error('Tag not found');
  const currentOrder: number = tagData.sort_order;
  if (currentOrder === 0) return;

  const { data: neighbor } = await supabase
    .from('profile_tags')
    .select('id, sort_order')
    .eq('user_id', currentUserId)
    .lt('sort_order', currentOrder)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!neighbor) return;

  const { error: e1 } = await supabase
    .from('profile_tags')
    .update({ sort_order: neighbor.sort_order })
    .eq('id', tagId);

  if (e1) throw new Error(`Failed to reorder tag: ${e1.message}`);

  const { error: e2 } = await supabase
    .from('profile_tags')
    .update({ sort_order: currentOrder })
    .eq('id', neighbor.id);

  if (e2) {
    await supabase.from('profile_tags').update({ sort_order: currentOrder }).eq('id', tagId);
    throw new Error(`Failed to reorder tag: ${e2.message}`);
  }
}

export async function reorderTagDown(tagId: string, currentUserId: string): Promise<void> {
  validateId(tagId, 'tagId');
  validateId(currentUserId, 'currentUserId');

  const { data: tagData, error: tagError } = await supabase
    .from('profile_tags')
    .select('sort_order')
    .eq('id', tagId)
    .single();

  if (tagError || !tagData) throw new Error('Tag not found');
  const currentOrder: number = tagData.sort_order;

  const { data: neighbor } = await supabase
    .from('profile_tags')
    .select('id, sort_order')
    .eq('user_id', currentUserId)
    .gt('sort_order', currentOrder)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!neighbor) return;

  const { error: e1 } = await supabase
    .from('profile_tags')
    .update({ sort_order: neighbor.sort_order })
    .eq('id', tagId);

  if (e1) throw new Error(`Failed to reorder tag: ${e1.message}`);

  const { error: e2 } = await supabase
    .from('profile_tags')
    .update({ sort_order: currentOrder })
    .eq('id', neighbor.id);

  if (e2) {
    await supabase.from('profile_tags').update({ sort_order: currentOrder }).eq('id', tagId);
    throw new Error(`Failed to reorder tag: ${e2.message}`);
  }
}

/** @deprecated Use getOwnerTagsForGallery or getMyTagsAppliedToGallery depending on context. */
export async function getGalleryTags(galleryId: string): Promise<GalleryTagInfo[]> {
  validateId(galleryId, 'galleryId');
  const { data, error } = await supabase.rpc('get_tags_for_galleries', {
    gallery_ids: [galleryId],
  });
  if (error) return [];
  return (data as GalleryTagInfo[]) ?? [];
}

/** @deprecated Use getOwnerTagsForGallery or getMyTagsAppliedToGallery depending on context. */
export async function getTagsForGalleries(
  galleryIds: string[],
): Promise<Map<string, GalleryTagInfo[]>> {
  if (!Array.isArray(galleryIds) || galleryIds.length === 0) return new Map();
  if (galleryIds.length > 200) throw new Error('Invalid id');
  for (const id of galleryIds) validateId(id, 'galleryId');

  const { data, error } = await supabase.rpc('get_tags_for_galleries', {
    gallery_ids: galleryIds,
  });

  if (error || !data) return new Map();

  const map = new Map<string, GalleryTagInfo[]>();
  for (const row of data as GalleryTagInfo[]) {
    const list = map.get(row.gallery_id) ?? [];
    list.push(row);
    map.set(row.gallery_id, list);
  }
  return map;
}

export async function getOwnerTagsForGallery(galleryId: string): Promise<GalleryTagInfo[]> {
  validateId(galleryId, 'galleryId');
  const { data: g } = await supabase.from('galleries').select('created_by').eq('id', galleryId).single();
  if (!g) return [];
  const { data, error } = await supabase
    .from('gallery_tag_applications')
    .select('gallery_id, applied_at, tag:profile_tags!inner(id, label, color, emoji, sort_order, user_id)')
    .eq('gallery_id', galleryId)
    .eq('tag.user_id', g.created_by);
  if (error || !data) return [];
  return (data as any[])
    .map((row) => {
      const t = row.tag;
      return { gallery_id: row.gallery_id, tag_id: t.id, label: t.label, color: t.color, emoji: t.emoji, sort_order: t.sort_order } as GalleryTagInfo;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getMyTagsAppliedToGallery(galleryId: string, viewerId: string): Promise<GalleryTagInfo[]> {
  validateId(galleryId, 'galleryId');
  if (!viewerId) throw new Error('Invalid viewerId');
  validateId(viewerId, 'viewerId');
  const { data, error } = await supabase
    .from('gallery_tag_applications')
    .select('gallery_id, applied_at, tag:profile_tags!inner(id, label, color, emoji, sort_order, user_id)')
    .eq('gallery_id', galleryId)
    .eq('tag.user_id', viewerId);
  if (error || !data) return [];
  return (data as any[])
    .map((row) => {
      const t = row.tag;
      return { gallery_id: row.gallery_id, tag_id: t.id, label: t.label, color: t.color, emoji: t.emoji, sort_order: t.sort_order } as GalleryTagInfo;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getOwnerTagsForGalleries(galleryIds: string[]): Promise<Map<string, GalleryTagInfo[]>> {
  if (!Array.isArray(galleryIds) || galleryIds.length === 0) return new Map();
  if (galleryIds.length > 200) throw new Error('Invalid galleryIds');
  for (const id of galleryIds) validateId(id, 'galleryId');

  const { data: gs } = await supabase.from('galleries').select('id, created_by').in('id', galleryIds);
  if (!gs || gs.length === 0) return new Map();

  const ownerMap = new Map<string, string>();
  for (const g of gs) ownerMap.set(g.id, g.created_by);

  const { data, error } = await supabase
    .from('gallery_tag_applications')
    .select('gallery_id, tag:profile_tags!inner(id, label, color, emoji, sort_order, user_id)')
    .in('gallery_id', galleryIds);

  if (error || !data) return new Map();

  const result = new Map<string, GalleryTagInfo[]>();
  for (const row of data as any[]) {
    const t = row.tag;
    if (t.user_id !== ownerMap.get(row.gallery_id)) continue;
    const info: GalleryTagInfo = { gallery_id: row.gallery_id, tag_id: t.id, label: t.label, color: t.color, emoji: t.emoji, sort_order: t.sort_order };
    const list = result.get(row.gallery_id) ?? [];
    list.push(info);
    result.set(row.gallery_id, list);
  }
  for (const [k, v] of result) result.set(k, v.sort((a, b) => a.sort_order - b.sort_order));
  return result;
}

export async function getMyTagsAppliedToGalleries(galleryIds: string[], viewerId: string): Promise<Map<string, GalleryTagInfo[]>> {
  if (!Array.isArray(galleryIds) || galleryIds.length === 0) return new Map();
  if (galleryIds.length > 200) throw new Error('Invalid galleryIds');
  for (const id of galleryIds) validateId(id, 'galleryId');
  if (!viewerId) throw new Error('Invalid viewerId');
  validateId(viewerId, 'viewerId');

  const { data, error } = await supabase
    .from('gallery_tag_applications')
    .select('gallery_id, tag:profile_tags!inner(id, label, color, emoji, sort_order, user_id)')
    .in('gallery_id', galleryIds)
    .eq('tag.user_id', viewerId);

  if (error || !data) return new Map();

  const result = new Map<string, GalleryTagInfo[]>();
  for (const row of data as any[]) {
    const t = row.tag;
    const info: GalleryTagInfo = { gallery_id: row.gallery_id, tag_id: t.id, label: t.label, color: t.color, emoji: t.emoji, sort_order: t.sort_order };
    const list = result.get(row.gallery_id) ?? [];
    list.push(info);
    result.set(row.gallery_id, list);
  }
  for (const [k, v] of result) result.set(k, v.sort((a, b) => a.sort_order - b.sort_order));
  return result;
}

export async function getGalleryIdsWithMyTags(viewerId: string, tagIds: string[]): Promise<Set<string>> {
  if (!viewerId) throw new Error('Invalid viewerId');
  validateId(viewerId, 'viewerId');
  if (!Array.isArray(tagIds)) throw new Error('Invalid tagIds');
  for (const id of tagIds) validateId(id, 'tagId');
  if (tagIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('gallery_tag_applications')
    .select('gallery_id, tag:profile_tags!inner(id, user_id)')
    .in('tag_id', tagIds)
    .eq('tag.user_id', viewerId);

  if (error || !data) return new Set();
  return new Set((data as any[]).map((row) => row.gallery_id));
}

export async function applyTagToGallery(galleryId: string, tagId: string): Promise<void> {
  validateId(galleryId, 'galleryId');
  validateId(tagId, 'tagId');
  const { error } = await supabase
    .from('gallery_tag_applications')
    .insert({ gallery_id: galleryId, tag_id: tagId });
  if (error) {
    if ((error as { code?: string }).code === '23505') return;
    throw new Error(`Failed to apply tag: ${error.message}`);
  }
}

export async function removeTagFromGallery(galleryId: string, tagId: string): Promise<void> {
  validateId(galleryId, 'galleryId');
  validateId(tagId, 'tagId');
  const { error } = await supabase
    .from('gallery_tag_applications')
    .delete()
    .eq('gallery_id', galleryId)
    .eq('tag_id', tagId);
  if (error) throw new Error(`Failed to remove tag: ${error.message}`);
}
