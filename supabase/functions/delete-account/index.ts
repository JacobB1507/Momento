import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT with anon client to get the calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;

    // Admin client for deletions and auth.admin.deleteUser
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const queries: Array<() => Promise<{ error: unknown }>> = [
      () => adminClient.from('photo_removal_votes').delete().eq('user_id', uid),
      () => adminClient.from('photo_removal_requests').delete().eq('requested_by', uid),
      () => adminClient.from('notification').delete().eq('user_id', uid),
      () => adminClient.from('messages').delete().eq('sender_id', uid),
      () => adminClient.from('message_requests').delete().or(`requester_id.eq.${uid},target_user_id.eq.${uid}`),
      () => adminClient.from('comments').delete().eq('user_id', uid),
      () => adminClient.from('friends').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
      () => adminClient.from('invites').delete().eq('sender_id', uid),
      () => adminClient.from('gallery_photos').delete().eq('uploaded_by', uid),
      () => adminClient.from('gallery_members').delete().eq('user_id', uid),
      () => adminClient.from('galleries').delete().eq('created_by', uid),
      () => adminClient.from('conversations').delete().or(`participant_1.eq.${uid},participant_2.eq.${uid}`),
      () => adminClient.from('profiles').delete().eq('id', uid),
    ];

    for (const query of queries) {
      const { error } = await query();
      if (error) {
        console.error('Deletion error:', error);
        return new Response(JSON.stringify({ error: (error as { message?: string }).message ?? 'Deletion failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteAuthError) {
      console.error('Auth deletion error:', deleteAuthError);
      return new Response(JSON.stringify({ error: deleteAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
