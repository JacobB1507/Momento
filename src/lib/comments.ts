import { supabase } from './supabase';
import { checkRateLimit, RateLimitError } from './rateLimit';
import { validateComment, sanitizeText } from './sanitize';

export const REPLY_LIMIT = 10; // Easy to change

export async function fetchComments(galleryId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: true })
    .is('parent_id', null);
  if (error) throw error;
  // Fetch profiles separately for each comment (no nested joins)
  const userIds = [...new Set((data ?? []).map((c: any) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  return (data ?? []).map((c: any) => ({ ...c, profile: profileMap[c.user_id] ?? null }));
}

export async function addComment(galleryId: string, userId: string, content: string, parentId?: string): Promise<any> {
  const allowed = await checkRateLimit('comment_send');
  if (!allowed) throw new RateLimitError('comment_send');

  const clean = sanitizeText(content);
  const validation = validateComment(clean);
  if (!validation.ok) throw new Error(validation.error!);

  const { data, error } = await supabase
    .from('comments')
    .insert({ gallery_id: galleryId, user_id: userId, content: clean, parent_id: parentId ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReplies(parentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
    .limit(REPLY_LIMIT);
  if (error) throw error;
  const userIds = [...new Set((data ?? []).map((c: any) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  return (data ?? []).map((c: any) => ({ ...c, profile: profileMap[c.user_id] ?? null }));
}

export async function editComment(commentId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ content, edited: true, edited_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

export function canEditComment(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= 2 * 60 * 1000;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}
