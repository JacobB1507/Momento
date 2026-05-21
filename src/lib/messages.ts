import { supabase } from './supabase';
import { checkRateLimit, RateLimitError } from './rateLimit';
import { validateMessage, sanitizeText } from './sanitize';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9-]+$/.test(id);
}

export type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  pinned_at_1: string | null;
  pinned_at_2: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  cleared_by_1?: boolean;
  cleared_by_2?: boolean;
  [key: string]: any;
  last_message_sender_id?: string | null;
  last_message_read?: boolean | null;
  last_message_read_at?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (error) throw error;

  const conversations = (data ?? [])
    .filter(c => {
      if (c.participant_1 === userId && c.cleared_by_1) return false;
      if (c.participant_2 === userId && c.cleared_by_2) return false;
      return true;
    })
    .map(c => ({
      ...c,
      is_pinned: c.participant_1 === userId ? !!c.pinned_at_1 : !!c.pinned_at_2,
      pinned_at: c.participant_1 === userId ? c.pinned_at_1 ?? null : c.pinned_at_2 ?? null,
    }))
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_pinned && b.is_pinned) {
        return new Date(b.pinned_at ?? 0).getTime() - new Date(a.pinned_at ?? 0).getTime();
      }
      return new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime();
    });

  if (conversations.length === 0) return conversations;

  const convIds = conversations.map(c => c.id);
  const { data: unreadRows, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convIds)
    .neq('sender_id', userId)
    .eq('read', false);

  if (unreadError) {
    console.warn('[messages] fetchConversations unread batch failed:', unreadError);
    return conversations.map(c => ({ ...c, unread_count: 0 }));
  }

  const unreadMap = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  }

  const { data: latestMessages, error: latestError } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, read, read_at, created_at')
    .in('conversation_id', convIds)
    .eq('deleted', false)
    .order('created_at', { ascending: false });

  if (latestError) {
    console.warn('[messages] fetchConversations latest-messages batch failed:', latestError);
  }

  const latestByConv = new Map<string, { sender_id: string; read: boolean; read_at: string | null }>();
  for (const row of latestMessages ?? []) {
    if (!latestByConv.has(row.conversation_id)) {
      latestByConv.set(row.conversation_id, {
        sender_id: row.sender_id,
        read: row.read ?? false,
        read_at: row.read_at ?? null,
      });
    }
  }

  return conversations.map(c => ({
    ...c,
    unread_count: unreadMap.get(c.id) ?? 0,
    last_message_sender_id: latestByConv.get(c.id)?.sender_id ?? null,
    last_message_read: latestByConv.get(c.id)?.read ?? null,
    last_message_read_at: latestByConv.get(c.id)?.read_at ?? null,
  }));
}

export async function setConversationPinned(conversationId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_conversation_pinned', {
    p_conversation_id: conversationId,
    p_pinned: pinned,
  });
  if (error) throw error;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  const allowed = await checkRateLimit('message_send');
  if (!allowed) throw new RateLimitError('message_send');

  const clean = sanitizeText(content);
  const validation = validateMessage(clean);
  if (!validation.ok) throw new Error(validation.error!);

  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: clean })
    .select('id, conversation_id, sender_id, content, created_at')
    .single();

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from('conversations')
    .update({ last_message: clean, last_message_at: message.created_at })
    .eq('id', conversationId);

  if (updateError) throw updateError;

  return message;
}

export const getOrCreateConversation = (userA: string, userB: string) => createConversation(userA, userB);

export async function createConversation(
  currentUserId: string,
  otherUserId: string,
): Promise<any> {
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`
    )
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      participant_1: currentUserId,
      participant_2: otherUserId,
      last_message: null,
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function requestMessagePermission(requesterId: string, targetUserId: string, messagePreview?: string): Promise<any> {
  const { data: oldRequest } = await supabase
    .from('message_requests')
    .select('id')
    .or(`and(requester_id.eq.${requesterId},target_user_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_user_id.eq.${requesterId})`)
    .limit(1);

  if (oldRequest && oldRequest.length > 0) {
    await supabase.from('message_requests').delete().eq('id', oldRequest[0].id);
  }

  const { data, error } = await supabase
    .from('message_requests')
    .insert({
      requester_id: requesterId,
      target_user_id: targetUserId,
      status: 'pending',
      message_preview: messagePreview ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function sendMessageRequest(
  requesterId: string,
  targetUserId: string,
  messageContent: string
): Promise<{ conversation: any; request: any }> {
  const conversation = await createConversation(requesterId, targetUserId);
  await sendMessage(conversation.id, requesterId, messageContent);
  const request = await requestMessagePermission(requesterId, targetUserId, messageContent);
  return { conversation, request };
}

export async function fetchMessageRequests(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('message_requests')
    .select('*')
    .eq('target_user_id', userId)
    .eq('status', 'pending');

  if (error) throw error;

  const requesterIds = (data ?? []).map(r => r.requester_id);
  if (requesterIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', requesterIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  return (data ?? []).map(r => ({ ...r, profile: profileMap[r.requester_id] }));
}

export async function respondToMessageRequest(requestId: string, accept: boolean, requesterId: string, targetUserId: string): Promise<any> {
  if (accept) {
    await supabase.from('message_requests').update({ status: 'accepted' }).eq('id', requestId);
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${requesterId},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${requesterId})`)
      .limit(1);
    return conv?.[0] || null;
  }

  await supabase.from('message_requests').update({ status: 'declined' }).eq('id', requestId);

  const { data: convData } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant_1.eq.${requesterId},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${requesterId})`)
    .limit(1);

  if (convData && convData.length > 0) {
    await supabase.from('messages').delete().eq('conversation_id', convData[0].id);
    await supabase.from('conversations').delete().eq('id', convData[0].id);
  }

  return null;
}

export async function editMessage(messageId: string, newContent: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ content: newContent, edited: true, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted: true, content: '' })
    .eq('id', messageId);
  if (error) throw error;
}

export async function sendImageMessage(conversationId: string, senderId: string, imageUri: string): Promise<any> {
  const fileName = `messages/${conversationId}/${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', { uri: imageUri, name: fileName, type: 'image/jpeg' } as any);
  const { error: uploadError } = await supabase.storage.from('message-photos').upload(fileName, formData);
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from('message-photos').getPublicUrl(fileName);
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: '', image_url: urlData.publicUrl })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function canEditOrDelete(createdAt: string): Promise<boolean> {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff <= 2 * 60 * 1000;
}

export async function clearConversationForUser(conversationId: string, userId: string): Promise<void> {
  const { data: convo } = await supabase
    .from('conversations')
    .select('participant_1, participant_2')
    .eq('id', conversationId)
    .single();

  if (!convo) return;

  const field = convo.participant_1 === userId ? 'cleared_by_1' : 'cleared_by_2';

  const { error } = await supabase
    .from('conversations')
    .update({ [field]: true })
    .eq('id', conversationId);

  if (error) throw error;
}

export async function markConversationRead(conversationId: string, currentUserId: string): Promise<number> {
  if (!isValidId(conversationId) || !isValidId(currentUserId)) throw new Error('Invalid args');
  const { data, error } = await supabase
    .from('messages')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .eq('read', false)
    .select('id');
  if (error) {
    console.warn('[messages] markConversationRead failed:', error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function getConversationUnreadCount(conversationId: string, currentUserId: string): Promise<number> {
  if (!isValidId(conversationId) || !isValidId(currentUserId)) throw new Error('Invalid args');
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .eq('read', false);
  if (error) {
    console.warn('[messages] getConversationUnreadCount failed:', error);
    return 0;
  }
  return count ?? 0;
}

export async function getTotalUnreadCount(currentUserId: string): Promise<number> {
  if (!isValidId(currentUserId)) throw new Error('Invalid args');
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', currentUserId)
    .eq('read', false);
  if (error) {
    console.warn('[messages] getTotalUnreadCount failed:', error);
    return 0;
  }
  return count ?? 0;
}
