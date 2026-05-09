export async function getTrustedFriends(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('trusted_friends')
    .select('trusted_user_id, profiles:trusted_user_id(id, username, display_name, avatar_url)')
    .eq('user_id', user.id);
  return data || [];
}

export async function addTrustedFriend(supabase: any, trustedUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('trusted_friends').insert({ user_id: user.id, trusted_user_id: trustedUserId });
}

export async function removeTrustedFriend(supabase: any, trustedUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('trusted_friends').delete().eq('user_id', user.id).eq('trusted_user_id', trustedUserId);
}

export async function isTrustedFriend(supabase: any, trustedUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('trusted_friends')
    .select('id')
    .eq('user_id', user.id)
    .eq('trusted_user_id', trustedUserId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
