import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) ||
    "default_salt_key";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { pin, location_id } = await req.json();

    if (!pin || !location_id) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "INVALID_REQUEST",
          message: "PIN и точка обязательны",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, location_id")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    if (fetchError) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "SERVER_ERROR",
          message: fetchError.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eligibleProfiles = (profiles || []).filter(
      p => p.location_id === null || p.location_id === location_id
    );

    const inputHash = await hashPin(pin);

    for (const profile of eligibleProfiles) {
      if (profile.pin_hash !== inputHash) continue;

      const { data: openShift } = await supabase
        .from("shifts")
        .select("id, location_id, location:locations(name)")
        .eq("user_id", profile.id)
        .is("ended_at", null)
        .maybeSingle();

      if (openShift && openShift.location_id !== location_id) {
        const locationName =
          (openShift.location as any)?.name || "другой точке";

        return new Response(
          JSON.stringify({
            success: false,
            code: "SHIFT_OPEN_AT_ANOTHER_LOCATION",
            location: locationName,
            message: `Смена открыта в "${locationName}". Закройте её перед входом.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: profile.id,
            full_name: profile.full_name,
            role: roleData?.role || "cashier",
            location_id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        code: "INVALID_PIN",
        message: "Неверный PIN-код",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        code: "SERVER_ERROR",
        message: e instanceof Error ? e.message : "Ошибка сервера",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
