import { supabase } from './supabase';

export async function blockUser(blockedUserId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (blockedUserId === user.id) return { error: 'Cannot block yourself' };

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedUserId });

  if (error && error.code === '23505') return { error: null };
  return { error: error?.message ?? null };
}

export async function unblockUser(blockedUserId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedUserId);

  return { error: error?.message ?? null };
}

export async function isBlocked(otherUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', otherUserId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export type BlockedUserProfile = {
  block_id: string;
  blocked_id: string;
  blocked_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function fetchBlockedUsers(): Promise<Array<{
  block_id: string;
  blocked_id: string;
  blocked_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_blocked_user_profiles');

  if (error) return [];
  return data ?? [];
}
