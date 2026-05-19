import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePayload {
  action?: 'create' | 'invite' | 'reset-password'
  // create / invite
  name?: string
  email?: string
  password?: string
  unit_id?: string
  role?: string
  must_change_password?: boolean
  org_id?: string
  // reset-password
  person_id?: string
  new_password?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Service-role client — bypasses RLS, can call auth.admin.*
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify the calling user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authErr } =
      await supabaseAdmin.auth.getUser(token)
    if (authErr || !caller) throw new Error('Not authenticated')

    // Verify caller is global admin or unit admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_global_admin')
      .eq('id', caller.id)
      .single()

    if (!callerProfile?.is_global_admin) {
      // Check if caller has any admin role in people_units
      const { data: adminRows } = await supabaseAdmin
        .from('people_units')
        .select('id')
        .eq('person_id', caller.id)
        .in('role', ['admin', 'lead'])
        .limit(1)
      if (!adminRows || adminRows.length === 0) {
        throw new Error('Forbidden: admin privileges required')
      }
    }

    const payload: CreatePayload = await req.json()
    const action = payload.action ?? 'create'

    // ── Action: reset-password ────────────────────────────────────────────
    if (action === 'reset-password') {
      const { person_id, new_password } = payload
      if (!person_id || !new_password) throw new Error('person_id and new_password required')

      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
        person_id,
        { password: new_password },
      )
      if (pwErr) throw pwErr

      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', person_id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Action: invite ────────────────────────────────────────────────────
    if (action === 'invite') {
      const { email, unit_id, role = 'member', org_id } = payload
      if (!email || !unit_id || !org_id) throw new Error('email, unit_id, and org_id are required')

      const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: `${siteUrl}/onboarding/profile` },
      )
      if (inviteErr) throw inviteErr

      const userId = inviteData.user.id

      // Upsert profile with pending status + org assignment
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email,
        org_id,
        status: 'pending',
        must_change_password: false,
      }, { onConflict: 'id' })

      // Assign primary unit membership
      await supabaseAdmin.from('people_units').insert({
        person_id: userId,
        unit_id,
        role,
        is_primary: true,
        org_id,
      }).then(() => {}) // ignore conflict if already exists

      // Log to audit_log
      await supabaseAdmin.from('audit_log').insert({
        org_id,
        actor_id: caller.id,
        action: 'user.invited',
        target_type: 'profile',
        target_id: userId,
        metadata: { email, unit_id, role },
      }).then(() => {})

      return new Response(
        JSON.stringify({ person_id: userId, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Action: create ────────────────────────────────────────────────────
    const { name, email, password, unit_id, role = 'member', must_change_password = true } = payload
    if (!name || !email || !password || !unit_id) {
      throw new Error('name, email, password, and unit_id are required')
    }

    // 1. Create auth user (email already confirmed — no email verification step)
    const { data: createdUser, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
    if (createErr) throw createErr
    const userId = createdUser.user!.id

    // 2. Upsert profile (the on_auth_user_created trigger may have already fired)
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        email,
        status: 'active',
        must_change_password,
      }, { onConflict: 'id' })

    // 3. Add primary unit membership
    await supabaseAdmin
      .from('people_units')
      .insert({
        person_id: userId,
        unit_id,
        role,
        is_primary: true,
      })

    // 4. Assign org from caller's profile
    const { data: callerProf } = await supabaseAdmin
      .from('profiles').select('org_id').eq('id', caller.id).single()
    if (callerProf?.org_id) {
      await supabaseAdmin.from('profiles')
        .update({ org_id: callerProf.org_id })
        .eq('id', userId)
      await supabaseAdmin.from('people_units')
        .update({ org_id: callerProf.org_id })
        .eq('person_id', userId)
    }

    return new Response(
      JSON.stringify({ person_id: userId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
