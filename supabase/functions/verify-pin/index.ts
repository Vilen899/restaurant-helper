import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://flexi-table-pal.lovable.app",
  "https://id-preview--e4123934-78cd-467c-8d52-a699940728a8.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "default_salt_key";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Validate PIN format (4 digits only)
    if (!/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "INVALID_PIN", message: "PIN должен содержать 4 цифры" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = getClientIp(req);
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    // Check rate limit: count failed attempts in the window
    const { count } = await supabase
      .from("pin_attempts")
      .select("*", { count: "exact", head: true })
      .eq("location_id", location_id)
      .gte("attempted_at", windowStart);

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: `Слишком много попыток. Повторите через ${WINDOW_MINUTES} минут`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, pin_hash, is_active, hourly_rate")
      .eq("is_active", true)
      .not("pin_hash", "is", null);

    const inputHash = await hashPin(pin);
    const profile = profiles?.find((p) => p.pin_hash === inputHash);

    if (!profile) {
      // Record failed attempt
      await supabase.from("pin_attempts").insert({
        location_id,
        ip_address: clientIp,
      });

      const remainingAttempts = MAX_ATTEMPTS - ((count ?? 0) + 1);

      return new Response(
        JSON.stringify({
          error: "INVALID_PIN",
          message: remainingAttempts > 0
            ? `Доступ отклонен: проверьте код (осталось ${remainingAttempts} попыток)`
            : `Доступ отклонен. Повторите через ${WINDOW_MINUTES} минут`,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .maybeSingle();

    const userRole = roleData?.role || "cashier";

    const { data: openShift } = await supabase
      .from("shifts")
      .select("location_id, location:locations(name)")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle();

    if (openShift && openShift.location_id !== location_id) {
      const locationName = (openShift.location as any)?.name || "другой точке";
      return new Response(
        JSON.stringify({ error: "SHIFT_OPEN_AT_ANOTHER_LOCATION", message: `Внимание: ваша смена не закрыта в "${locationName}"` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: profile.id, full_name: profile.full_name, location_id, role: userRole, hourly_rate: profile.hourly_rate || 0 },
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
