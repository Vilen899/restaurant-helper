import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: any) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function hashPin(pin: string) {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "default_salt_key";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const pin = body.pin;
    const location_id = body.location_id;

    if (!pin || !location_id) {
      return json({
        success: false,
        code: "INVALID_REQUEST",
        message: "PIN и точка обязательны",
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, location_id")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    const inputHash = await hashPin(pin);

    for (const profile of profiles || []) {
      if (profile.pin_hash !== inputHash || (profile.location_id && profile.location_id !== location_id)) {
        continue;
      }

      const { data: openShift } = await supabase
        .from("shifts")
        .select("location_id, location:locations(name)")
        .eq("user_id", profile.id)
        .is("ended_at", null)
        .maybeSingle();

      if (openShift && openShift.location_id !== location_id) {
        const locationName = (openShift.location as any)?.name || "другой точке";

        return json({
          success: false,
          code: "SHIFT_OPEN_AT_ANOTHER_LOCATION",
          message: `Смена открыта в "${locationName}". Закройте её перед входом.`,
          location: locationName,
        });
      }

      return json({
        success: true,
        user: {
          id: profile.id,
          full_name: profile.full_name,
          location_id,
        },
      });
    }

    return json({
      success: false,
      code: "INVALID_PIN",
      message: "Неверный PIN-код",
    });
  } catch (e) {
    return json({
      success: false,
      code: "SERVER_ERROR",
      message: "Ошибка сервера",
    });
  }
});
