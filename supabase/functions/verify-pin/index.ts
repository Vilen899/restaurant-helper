import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Same hash function as in hash-pin
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { pin, location_id } = await req.json()

    if (!pin || !location_id) {
      return new Response(
        JSON.stringify({ error: 'PIN and location_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find users with PIN at this location
    const { data: profiles, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, pin_hash, location_id')
      .eq('location_id', location_id)
      .not('pin_hash', 'is', null)

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to match PIN
    for (const profile of profiles || []) {
      if (!profile.pin_hash) continue
      
      const [salt, storedHash] = profile.pin_hash.split(':')
      const inputHash = await hashPin(pin, salt)
      
      if (inputHash === storedHash) {
        // Get user role
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .single()

        // Generate a custom token for this user session
        // In production, you might want to use Supabase's signInWithPassword or a custom JWT
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: {
              id: profile.id,
              full_name: profile.full_name,
              role: roleData?.role || 'cashier',
              location_id: profile.location_id
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid PIN' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
