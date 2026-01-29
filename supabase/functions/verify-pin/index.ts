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
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", message: "Укажите PIN и точку продажи" }), {
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
    const profile = profiles?.find((p) => p.pin_hash === inputHash);

    // СООБЩЕНИЕ: НЕВЕРНЫЙ КОД
    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "INVALID_PIN",
          message: "Доступ отклонен: проверьте код",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: openShift } = await supabase
      .from("shifts")
      .select("location_id, location:locations(name)")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle();

    // СООБЩЕНИЕ: ОТКРЫТАЯ СМЕНА
    if (openShift && openShift.location_id !== location_id) {
      const locationName = (openShift.location as any)?.name || "другой точке";
      return new Response(
        JSON.stringify({
          error: "SHIFT_OPEN_AT_ANOTHER_LOCATION",
          message: `Внимание: ваша смена не закрыта в "${locationName}"`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: profile.id, full_name: profile.full_name, location_id },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: "Ошибка системы. Попробуйте позже" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
