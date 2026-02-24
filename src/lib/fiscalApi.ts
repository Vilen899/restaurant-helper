import { supabase } from "@/integrations/supabase/client";

export type FiscalAction = "test_connection" | "print_receipt" | "x_report" | "z_report" | "test_check" | "open_drawer";
export type FiscalMode = "cloud" | "local";

export interface FiscalResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/** Get saved KKM mode from localStorage (default: cloud) */
export function getFiscalMode(): FiscalMode {
  return (localStorage.getItem("fiscal_mode") as FiscalMode) || "cloud";
}

/** Save KKM mode */
export function setFiscalMode(mode: FiscalMode) {
  localStorage.setItem("fiscal_mode", mode);
}

/** Get local KKM config from localStorage */
function getLocalConfig(): { host: string; port: string } {
  const host = localStorage.getItem("fiscal_local_host") || "192.168.9.19";
  const port = localStorage.getItem("fiscal_local_port") || "8080";
  return { host, port };
}

/** Call fiscal via cloud edge function */
async function callFiscalCloud(
  action: FiscalAction,
  locationId?: string,
  orderData?: any,
): Promise<FiscalResult> {
  const { data, error } = await supabase.functions.invoke("fiscal-print", {
    body: { action, location_id: locationId, order_data: orderData },
  });

  if (error) {
    throw new Error(error.message || "Ошибка вызова фискальной функции");
  }

  return data as FiscalResult;
}

/** Call fiscal directly via local IP (browser → KKM, works only on HTTP or same network) */
async function callFiscalLocal(
  action: FiscalAction,
  _locationId?: string,
  orderData?: any,
): Promise<FiscalResult> {
  const { host, port } = getLocalConfig();
  const baseUrl = `http://${host}:${port}`;
  const timeout = 15000;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  try {
    switch (action) {
      case "test_connection": {
        // Try common HDM endpoints
        const endpoints = ["/api/v1/status", "/api/status", "/status", "/"];
        for (const ep of endpoints) {
          try {
            const res = await fetch(`${baseUrl}${ep}`, {
              method: "GET",
              headers,
              signal: AbortSignal.timeout(timeout),
            });
            if (res.ok || res.status < 500) {
              return { success: true, message: `ККМ подключена (${host}:${port})` };
            }
          } catch {
            continue;
          }
        }
        throw new Error(`ККМ недоступна: ${baseUrl}`);
      }

      case "test_check": {
        const testData = {
          items: [{ name: "Тестовый товар", quantity: 1, price: 1, amount: 1 }],
          total: 1,
          payments: [{ type: "cash", sum: 1 }],
        };
        const res = await fetch(`${baseUrl}/api/v1/receipt`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "sell", ...testData }),
          signal: AbortSignal.timeout(timeout),
        });
        if (res.ok) return { success: true, message: "Тестовый чек напечатан" };
        throw new Error(`Ошибка: ${res.status}`);
      }

      case "x_report": {
        const res = await fetch(`${baseUrl}/api/v1/report/x`, { method: "POST", headers, signal: AbortSignal.timeout(timeout) });
        return { success: res.ok, message: res.ok ? "X-отчёт напечатан" : `Ошибка: ${res.status}` };
      }

      case "z_report": {
        const res = await fetch(`${baseUrl}/api/v1/report/z`, { method: "POST", headers, signal: AbortSignal.timeout(timeout) });
        return { success: res.ok, message: res.ok ? "Z-отчёт напечатан" : `Ошибка: ${res.status}` };
      }

      case "print_receipt": {
        if (!orderData) throw new Error("Нет данных заказа");
        const receiptData = {
          type: "sell",
          items: orderData.items?.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: item.total || item.price * item.quantity,
          })),
          total: orderData.total,
          payments: [{ type: orderData.payment_method === "cash" ? "cash" : "card", sum: orderData.total }],
        };
        const res = await fetch(`${baseUrl}/api/v1/receipt`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
          signal: AbortSignal.timeout(timeout),
        });
        if (res.ok) return { success: true, message: "Чек напечатан" };
        throw new Error(`Ошибка печати: ${res.status}`);
      }

      case "open_drawer": {
        const res = await fetch(`${baseUrl}/api/v1/cashdrawer`, { method: "POST", headers, signal: AbortSignal.timeout(timeout) });
        return { success: res.ok, message: res.ok ? "Денежный ящик открыт" : "Ошибка" };
      }

      default:
        throw new Error(`Неизвестное действие: ${action}`);
    }
  } catch (err: any) {
    // Wrap mixed-content / network errors with helpful message
    if (err.message?.includes("Mixed Content") || err.message?.includes("blocked")) {
      throw new Error(`Браузер блокирует HTTP-запросы. Используйте облачный режим или откройте страницу по HTTP.`);
    }
    throw err;
  }
}

/** Universal caller — routes to local or cloud based on saved mode */
export async function callFiscal(
  action: FiscalAction,
  locationId?: string,
  orderData?: any,
): Promise<FiscalResult> {
  const mode = getFiscalMode();
  if (mode === "local") {
    return callFiscalLocal(action, locationId, orderData);
  }
  return callFiscalCloud(action, locationId, orderData);
}
