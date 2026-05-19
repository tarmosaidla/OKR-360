import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { title, description } = await req.json()
    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: corsHeaders })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: corsHeaders })
    }

    const userContent = description?.trim()
      ? `Objective: "${title.trim()}"\nAdditional context: ${description.trim()}`
      : `Objective: "${title.trim()}"`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are an expert OKR coach helping teams write measurable key results.
Given an objective, suggest exactly 3 to 5 specific, measurable key results for a single quarter.

Return ONLY valid JSON — no explanation, no markdown, no code fences — with this exact shape:
{
  "suggestions": [
    {
      "title": "string — concise, action-oriented KR title",
      "target_type": "numeric" | "percentage" | "boolean",
      "target_value": number,
      "unit": string | null
    }
  ]
}

Rules:
- "percentage": target_value is 0–100 (e.g. 85 means 85%). unit must be null.
- "numeric": target_value is the absolute goal number. unit describes what is being counted (e.g. "users", "$", "tickets").
- "boolean": use only for binary done/not-done outcomes. target_value is always 1. unit is null.
- Every KR must include a concrete number — never vague language like "improve" or "increase".
- Aim for ambitious but achievable quarterly targets.`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Anthropic API ${response.status}: ${body}`)
    }

    const ai = await response.json()
    const text: string = ai.content?.[0]?.text ?? ''

    let parsed: { suggestions: unknown[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      // Strip any accidental markdown code fences
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI returned unparseable response')
      parsed = JSON.parse(match[0])
    }

    if (!Array.isArray(parsed?.suggestions)) {
      throw new Error('Unexpected AI response shape')
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('suggest-krs error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
