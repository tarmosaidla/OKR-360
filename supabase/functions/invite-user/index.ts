import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  email: string
  full_name: string
  job_title?: string
  unit_id: string
  role: string
  invited_by: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Service role client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !caller) throw new Error('Not authenticated')

    // Verify caller has permission to invite (global admin or unit admin)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_global_admin')
      .eq('id', caller.id)
      .single()

    const payload: InvitePayload = await req.json()

    if (!callerProfile?.is_global_admin) {
      // Check if caller is admin of the target unit
      const { data: scope } = await supabaseAdmin
        .rpc('get_admin_scope', { p_admin_id: caller.id })
      const scopeIds = (scope ?? []).map((r: { unit_id: string }) => r.unit_id)
      if (!scopeIds.includes(payload.unit_id)) {
        throw new Error('Not authorised to invite to this unit')
      }
    }

    // Send invite email via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      payload.email,
      {
        data: {
          full_name: payload.full_name,
          job_title: payload.job_title ?? null,
        },
        redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/login`,
      }
    )
    if (inviteError) throw inviteError

    const invitedUserId = inviteData.user?.id
    if (!invitedUserId) throw new Error('Invite did not return a user id')

    // Create / update profiles row with pending status
    await supabaseAdmin.from('profiles').upsert({
      id: invitedUserId,
      full_name: payload.full_name,
      email: payload.email,
      job_title: payload.job_title ?? null,
      status: 'pending',
      invited_by: payload.invited_by,
      invited_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Create unit membership
    await supabaseAdmin.from('people_units').upsert({
      person_id: invitedUserId,
      unit_id: payload.unit_id,
      role: payload.role,
      is_primary: true,
    }, { onConflict: 'person_id,unit_id' })

    return new Response(
      JSON.stringify({ success: true, person_id: invitedUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
