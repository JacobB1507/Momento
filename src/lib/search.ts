import { supabase } from './supabase';

export async function searchUsers(query: string, currentUserId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio')
      .ilike('username', `%${query}%`)
      .neq('id', currentUserId)
      .limit(20);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function searchGalleries(query: string, currentUserId: string) {
  try {
    const { data, error } = await supabase
      .from('galleries')
      .select('*')
      .ilike('title', `%${query}%`)
      .eq('privacy', 'public')
      .neq('created_by', currentUserId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
