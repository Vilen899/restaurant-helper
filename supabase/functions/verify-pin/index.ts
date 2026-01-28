import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hash function compatible with bulk-create-staff
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 16) || 'default_salt_key'
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

    // Find all active users with a PIN set
    // Users with location_id = null can work at any location
    // Users with specific location_id can only work at that location
    const { data: profiles, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, pin_hash, location_id')
      .eq('is_active', true)
      .not('pin_hash', 'is', null)

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter to users who can work at this location
    const eligibleProfiles = (profiles || []).filter(p => 
      p.location_id === null || p.location_id === location_id
    )

    // Hash the input PIN
    const inputHash = await hashPin(pin)

    // Try to match PIN
    for (const profile of eligibleProfiles) {
      if (!profile.pin_hash) continue
      
      // Check if it matches our hash format (simple hash)
      if (inputHash === profile.pin_hash) {
        // Check if user has open shift at different location
        const { data: openShift } = await supabaseClient
          .from('shifts')
          .select('id, location_id, started_at, location:locations(name)')
          .eq('user_id', profile.id)
          .is('ended_at', null)
          .maybeSingle()

        if (openShift && openShift.location_id !== location_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const locationData = openShift.location as any
          const locationName = locationData?.name || 'другой точке'
          return new Response(
            JSON.stringify({ 
              error: 'SHIFT_OPEN_AT_ANOTHER_LOCATION',
              location_name: locationName,
              message: `Смена открыта в "${locationName}". Закройте её перед входом.`
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user role
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .single()

        return new Response(
          JSON.stringify({ 
            success: true, 
            user: {
              id: profile.id,
              full_name: profile.full_name,
              role: roleData?.role || 'cashier',
              location_id: location_id // Use selected location for session
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
