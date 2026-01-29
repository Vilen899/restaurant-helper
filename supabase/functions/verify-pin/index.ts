import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "default_salt_key";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const body = await req.json().catch(() => ({}));
    const { pin, location_id } = body;

    if (!pin || !location_id) {
      return new Response("INVALID_REQUEST: PIN и точка обязательны", { status: 400, headers: corsHeaders });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    const inputHash = await hashPin(pin);
    const profile = (profiles || []).find((p: any) => p.pin_hash === inputHash);

    if (!profile) {
      return new Response("INVALID_PIN", { status: 401, headers: corsHeaders });
    }

    // Проверяем открытую смену
    const { data: openShift } = await supabase
      .from("shifts")
      .select("location_id")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle();

    if (openShift && openShift.location_id !== location_id) {
      return new Response("SHIFT_OPEN_AT_ANOTHER_LOCATION", { status: 403, headers: corsHeaders });
    }

    // Успешный вход
    return new Response(JSON.stringify({ full_name: profile.full_name, id: profile.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-pin error:", e);
    return new Response("SERVER_ERROR", { status: 500, headers: corsHeaders });
  }
});
