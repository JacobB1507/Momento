export type SuggestedFriend = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  mutual_count: number;
  friend_count: number;
};

export async function getSuggestedFriends(supabase: any, limit = 20): Promise<SuggestedFriend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc('get_suggested_friends', {
    uid: user.id,
    result_limit: limit,
  });
  if (error) { console.error('getSuggestedFriends error:', error); return []; }
  return data || [];
}
