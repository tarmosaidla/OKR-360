import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) throw new Error('Missing authorization header')

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !caller) throw new Error('Not authenticated')

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, is_global_admin')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.is_global_admin) throw new Error('Forbidden: global admin required')

    const orgId = callerProfile.org_id
    if (!orgId) throw new Error('No organisation found')

    // 1. Get all demo user IDs for this org
    const { data: demoProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'demo')

    // 2. Delete demo users from auth (cascades to profiles + people_units)
    let deletedUsers = 0
    for (const p of (demoProfiles ?? []) as { id: string }[]) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(p.id)
      if (!delErr) deletedUsers++
    }

    // 3. Clean up sample DB records (objectives, KRs, checkins, KPIs)
    //    Via the SECURITY DEFINER RPC — must call as the caller's session
    //    Since we have the caller's token, use a regular client for the RPC
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    await callerClient.rpc('clear_sample_data')

    return new Response(
      JSON.stringify({ success: true, deleted_users: deletedUsers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[clear-sample-data] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
