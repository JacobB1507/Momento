import { supabase } from './supabase';

export type Conversation = {
  id: string;
  participants: string[];
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
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
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  const filtered = (data ?? []).filter(c => {
    if (c.participant_1 === userId && c.cleared_by_1) return false;
    if (c.participant_2 === userId && c.cleared_by_2) return false;
    return true;
  });
  return filtered;
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
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select('id, conversation_id, sender_id, content, created_at')
    .single();

  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from('conversations')
    .update({ last_message: content, last_message_at: message.created_at })
    .eq('id', conversationId);

  if (updateError) throw updateError;

  return message;
}

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
  const { data: existing } = await supabase
    .from('message_requests')
    .select('*')
    .eq('requester_id', requesterId)
    .eq('target_user_id', targetUserId)
    .single();

  if (existing) return existing;

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
  await supabase
    .from('message_requests')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', requestId);

  if (accept) {
    return await createConversation(targetUserId, requesterId);
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
