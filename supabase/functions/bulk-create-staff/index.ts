import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffMember {
  full_name: string;
  pin: string;
  role: "cashier" | "cook" | "manager" | "admin";
  location_id?: string;
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "default_salt_key";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateEmailFromName(name: string, index: number): string {
  // Simple transliteration - just use index-based email for reliability
  const timestamp = Date.now();
  return `staff${index}_${timestamp}@crusty.local`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { staff, default_location_id } = await req.json() as { 
      staff: StaffMember[]; 
      default_location_id?: string;
    };

    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      return new Response(JSON.stringify({ error: "No staff data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < staff.length; i++) {
      const member = staff[i];
      try {
        const email = generateEmailFromName(member.full_name, i);
        const password = member.pin + member.pin; // PIN repeated twice as password

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: member.full_name },
        });

        if (authError) {
          results.push({ name: member.full_name, success: false, error: authError.message });
          continue;
        }

        const userId = authData.user.id;
        const pinHash = await hashPin(member.pin);

        // Update profile
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: member.full_name,
            location_id: member.location_id || default_location_id || null,
            pin_hash: pinHash,
            is_active: true,
          })
          .eq("id", userId);

        // Create role
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: member.role });

        results.push({ name: member.full_name, success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ name: member.full_name, success: false, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        created: successCount, 
        total: staff.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
