import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: any) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, message: "Неверный формат запроса (не JSON)" });
    }

    const { pin, location_id } = body;

    if (!pin || !location_id) {
      return jsonResponse({ success: false, message: "PIN и точка обязательны" });
    }

    // Получаем активные профили
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, location_id")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      return jsonResponse({ success: false, message: "Ошибка базы данных" });
    }

    const inputHash = await hashPin(pin);

    // Ищем совпадение
    for (const profile of profiles ?? []) {
      if (profile.pin_hash !== inputHash) continue;

      // Проверяем, работает ли этот пользователь в выбранной точке
      if (profile.location_id && profile.location_id !== location_id) continue;

      // Проверяем открытые смены
      const { data: openShift } = await supabase
        .from("shifts")
        .select("location_id, location:locations(name)")
        .eq("user_id", profile.id)
        .is("ended_at", null)
        .maybeSingle();

      if (openShift && openShift.location_id !== location_id) {
        const locationName = (openShift.location as any)?.name || "другой точке";
        return jsonResponse({
          success: false,
          message: `Смена открыта в "${locationName}". Закройте её перед входом.`,
        });
      }

      // Успешный вход
      return jsonResponse({
        success: true,
        user: { id: profile.id, full_name: profile.full_name, location_id },
      });
    }

    // PIN не совпал
    return jsonResponse({ success: false, message: "Неверный PIN-код" });
  } catch (e) {
    console.error("Verify PIN unexpected error:", e);
    return jsonResponse({
      success: false,
      message: e instanceof Error ? e.message : "Неизвестная ошибка",
    });
  }
});
