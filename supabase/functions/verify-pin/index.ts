import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const { pin, location_id } = body;

    if (!pin || !location_id) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", message: "PIN и точка обязательны" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const inputHash = await hashPin(pin);

    // Ищем кассира с таким PIN
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, is_active")
      .eq("is_active", true)
      .eq("pin_hash", inputHash)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "INVALID_PIN", message: "Неверный PIN-код" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Проверяем открытую смену
    const { data: openShift } = await supabase
      .from("shifts")
      .select("id, location_id, locations(name)")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle();

    if (openShift && openShift.location_id !== location_id) {
      const locationName = (openShift as any)?.locations?.name || "другой точке";
      return new Response(
        JSON.stringify({
          error: "SHIFT_OPEN_AT_ANOTHER_LOCATION",
          location_name: locationName,
          message: `Смена открыта в "${locationName}". Закройте её перед входом.`,
        }),
        { status: 403, headers: corsHeaders },
      );
    }

    // Всё ок — возвращаем данные пользователя
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.id,
          full_name: profile.full_name,
          location_id,
        },
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (e) {
    console.error("verify-pin error:", e);
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: "Ошибка сервера" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
