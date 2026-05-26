import { supabase } from './supabase';

const ALLOWED_CONTENT_TYPES = ['user', 'photo', 'gallery', 'message'] as const;
type ContentType = typeof ALLOWED_CONTENT_TYPES[number];

const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 5;
const recentReportTimestamps: number[] = [];

export async function submitReport(params: {
  reportedUserId?: string;
  contentType: ContentType;
  contentId?: string;
  reason: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(params.contentType)) {
    return { ok: false, error: 'Invalid content type' };
  }

  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  while (recentReportTimestamps.length > 0 && recentReportTimestamps[0] < cutoff) {
    recentReportTimestamps.shift();
  }
  if (recentReportTimestamps.length >= MAX_REPORTS_PER_WINDOW) {
    return { ok: false, error: 'Too many reports submitted. Please wait a few minutes.' };
  }

  const sanitizedNotes = params.notes
    ? params.notes.trim().slice(0, 500).replace(/[\x00-\x1F]/g, '')
    : null;

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: session.user.id,
    reported_user_id: params.reportedUserId ?? null,
    content_type: params.contentType,
    content_id: params.contentId ?? null,
    reason: params.reason,
    notes: sanitizedNotes,
  });

  if (error) return { ok: false, error: error.message };

  recentReportTimestamps.push(now);
  return { ok: true };
}
