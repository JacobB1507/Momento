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
  return data ?? [];
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

export async function requestMessagePermission(
  requesterId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('message_requests')
    .insert({ requester_id: requesterId, target_user_id: targetUserId, status: 'pending' });

  if (error) throw error;
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
