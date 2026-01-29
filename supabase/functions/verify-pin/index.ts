// supabase/functions/verify-pin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPin(pin: string) {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "default_salt";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const { pin, location_id } = body;

    if (!pin || !location_id) {
      return new Response(JSON.stringify({ success: false, message: "PIN и точка обязательны" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, is_active")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    const inputHash = await hashPin(pin);

    for (const profile of profiles || []) {
      if (profile.pin_hash !== inputHash) continue;

      // Проверяем открытую смену
      const { data: openShift } = await supabase
        .from("shifts")
        .select("location_id")
        .eq("user_id", profile.id)
        .is("ended_at", null)
        .maybeSingle();

      if (openShift && openShift.location_id !== location_id) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Смена открыта в другой локации. Закройте её перед входом`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ✅ Всё ок — возвращаем данные пользователя
      return new Response(
        JSON.stringify({
          success: true,
          user: { id: profile.id, full_name: profile.full_name, location_id },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // PIN не найден
    return new Response(JSON.stringify({ success: false, message: "Неверный PIN-код" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, message: "Ошибка сервера" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
