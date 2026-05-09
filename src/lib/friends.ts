import { supabase } from './supabase';

export async function sendFriendRequest(
  senderId: string,
  receiverUsername: string,
): Promise<'sent' | 'not_found' | 'already_friends' | 'error'> {
  const { data: receiver, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', receiverUsername.trim())
    .maybeSingle();

  if (lookupError) return 'error';
  if (!receiver) return 'not_found';

  const { error: insertError } = await supabase
    .from('friends')
    .insert({ sender_id: senderId, receiver_id: receiver.id, status: 'pending' });

  if (insertError) {
    if (insertError.code === '23505') return 'already_friends';
    return 'error';
  }

  return 'sent';
}

export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('id, sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error || !data) return [];

  const profiles = await Promise.all(
    data.map(async (row) => {
      const otherId = row.sender_id === userId ? row.receiver_id : row.sender_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherId)
        .maybeSingle();
      return profile;
    }),
  );

  return profiles.filter(Boolean);
}

export async function getPendingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('id, sender_id')
    .eq('receiver_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];

  const results = await Promise.all(
    data.map(async (row) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', row.sender_id)
        .maybeSingle();
      if (!profile) return null;
      return { friendshipId: row.id, profile };
    }),
  );

  return results.filter(Boolean) as { friendshipId: string; profile: { id: string; username: string; avatar_url: string } }[];
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('friends')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', friendshipId);

  return !error;
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  return !error;
}

export async function createInviteLink(senderId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('invites')
    .insert({ sender_id: senderId })
    .select('code')
    .single();

  if (error || !data) return null;
  return `momento://invite/${data.code}`;
}

export async function resolveInviteCode(
  code: string,
  receiverId: string,
): Promise<'ok' | 'already_used' | 'not_found' | 'error'> {
  const { data: invite, error: lookupError } = await supabase
    .from('invites')
    .select('id, sender_id, accepted_by')
    .eq('code', code)
    .maybeSingle();

  if (lookupError) return 'error';
  if (!invite) return 'not_found';
  if (invite.accepted_by) return 'already_used';

  const { error: updateError } = await supabase
    .from('invites')
    .update({ accepted_by: receiverId })
    .eq('id', invite.id);

  if (updateError) return 'error';

  const { data: senderProfile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', invite.sender_id)
    .maybeSingle();

  if (profileError || !senderProfile?.username) return 'error';

  const result = await sendFriendRequest(receiverId, senderProfile.username);
  if (result === 'sent' || result === 'already_friends') return 'ok';
  return 'error';
}

export async function getMutualFriends(currentUserId: string, otherUserId: string): Promise<any[]> {
  const getFriendIds = async (uid: string): Promise<string[]> => {
    const { data } = await supabase
      .from('friends')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
    return (data ?? []).map(f => f.sender_id === uid ? f.receiver_id : f.sender_id);
  };

  const [myFriendIds, theirFriendIds] = await Promise.all([
    getFriendIds(currentUserId),
    getFriendIds(otherUserId),
  ]);

  const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));
  if (mutualIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', mutualIds);

  return profiles ?? [];
}
