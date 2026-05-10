import { supabase } from './supabase';

export async function markTutorialComplete(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ tutorial_completed: true })
      .eq('id', userId);
  } catch (err) {
    console.warn('[tutorial] markTutorialComplete failed:', err);
  }
}

export async function fetchTutorialCompleted(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tutorial_completed')
      .eq('id', userId)
      .single();
    if (error) return true;
    return data?.tutorial_completed ?? true;
  } catch {
    return true;
  }
}
