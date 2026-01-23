import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrintRequest {
  action: "print_receipt" | "open_drawer" | "test_connection" | "x_report" | "z_report";
  location_id?: string;
  order_data?: {
    order_number: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    payment_method: string;
    cashier_name: string;
    date: string;
  };
}

interface FiscalSettings {
  id: string;
  location_id: string;
  enabled: boolean;
  driver: string;
  connection_type: string;
  api_url: string | null;
  ip_address: string | null;
  port: string | null;
  api_login: string | null;
  api_password: string | null;
  api_token: string | null;
  device_id: string | null;
  inn: string | null;
  operator_name: string | null;
  company_name: string | null;
  // HDM-specific fields (Armenian fiscal printers)
  kkm_password: string | null;
  vat_rate: number | null;
  terminal_id: string | null;
  default_timeout: number | null;
  payment_timeout: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PrintRequest = await req.json();
    const { action, location_id, order_data } = body;

    // Get user's location if not provided
    let targetLocationId = location_id;
    if (!targetLocationId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("location_id")
        .eq("id", user.id)
        .single();
      
      targetLocationId = profile?.location_id;
    }

    if (!targetLocationId) {
      return new Response(JSON.stringify({ error: "No location found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fiscal settings for location
    const { data: settings, error: settingsError } = await supabase
      .from("fiscal_settings")
      .select("*")
      .eq("location_id", targetLocationId)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "Fiscal settings not configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.enabled) {
      return new Response(JSON.stringify({ error: "Fiscal printing is disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute action based on driver type
    const result = await executeFiscalAction(settings as FiscalSettings, action, order_data);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Fiscal print error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeFiscalAction(
  settings: FiscalSettings,
  action: string,
  orderData?: PrintRequest["order_data"]
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const { driver, api_url, ip_address, port, api_login, api_password, api_token } = settings;

  // Build base URL
  let baseUrl = api_url;
  if (!baseUrl && ip_address) {
    baseUrl = `http://${ip_address}${port ? `:${port}` : ""}`;
  }

  if (!baseUrl) {
    throw new Error("No API URL or IP address configured");
  }

  // Build headers with authentication
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (api_token) {
    headers["Authorization"] = `Bearer ${api_token}`;
  } else if (api_login && api_password) {
    headers["Authorization"] = `Basic ${btoa(`${api_login}:${api_password}`)}`;
  }

  // Execute based on driver type
  switch (driver) {
    case "hdm":
      return await hdmRequest(baseUrl, headers, action, orderData, settings);
    case "atol":
      return await atolRequest(baseUrl, headers, action, orderData, settings);
    case "shtrih":
      return await shtrihRequest(baseUrl, headers, action, orderData, settings);
    case "evotor":
      return await evotorRequest(baseUrl, headers, action, orderData, settings);
    case "newland":
      return await newlandRequest(baseUrl, headers, action, orderData, settings);
    case "aisino":
      return await aisinoRequest(baseUrl, headers, action, orderData, settings);
    case "custom":
    default:
      return await customApiRequest(baseUrl, headers, action, orderData, settings);
  }
}

// ATOL driver implementation
async function atolRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const endpoint = `${baseUrl}/api/v1`;
  
  try {
    switch (action) {
      case "test_connection": {
        const response = await fetch(`${endpoint}/status`, { headers, method: "GET" });
        if (response.ok) {
          return { success: true, message: "ATOL connected" };
        }
        throw new Error(`Status: ${response.status}`);
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        const receiptData = {
          type: "sell",
          taxationType: "osn",
          operator: { name: settings?.operator_name || "Кассир" },
          items: orderData.items.map(item => ({
            type: "position",
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            amount: item.total,
            tax: { type: "none" },
          })),
          payments: [{
            type: orderData.payment_method === "cash" ? "cash" : "electronically",
            sum: orderData.total,
          }],
          total: orderData.total,
        };
        
        const response = await fetch(`${endpoint}/receipt`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
        });
        
        if (response.ok) {
          return { success: true, message: "Receipt printed", data: await response.json() };
        }
        throw new Error(`Print failed: ${response.status}`);
      }
      
      case "open_drawer": {
        const response = await fetch(`${endpoint}/cashdrawer`, {
          method: "POST",
          headers,
          body: JSON.stringify({ command: "open" }),
        });
        return { success: response.ok, message: response.ok ? "Drawer opened" : "Failed" };
      }
      
      case "x_report": {
        const response = await fetch(`${endpoint}/report/x`, { method: "POST", headers });
        return { success: response.ok, message: "X-report printed" };
      }
      
      case "z_report": {
        const response = await fetch(`${endpoint}/report/z`, { method: "POST", headers });
        return { success: response.ok, message: "Z-report printed" };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`ATOL error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Shtrih-M driver implementation
async function shtrihRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    switch (action) {
      case "test_connection": {
        const response = await fetch(`${baseUrl}/api/status`, { headers });
        return { success: response.ok, message: response.ok ? "Shtrih-M connected" : "Connection failed" };
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        const receiptData = {
          document_type: 1, // Sale
          operator: settings?.operator_name || "Кассир",
          positions: orderData.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            sum: item.total,
          })),
          payment: {
            type: orderData.payment_method === "cash" ? 0 : 1,
            sum: orderData.total,
          },
        };
        
        const response = await fetch(`${baseUrl}/api/receipt`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
        });
        
        return { success: response.ok, message: response.ok ? "Receipt printed" : "Print failed" };
      }
      
      case "open_drawer": {
        const response = await fetch(`${baseUrl}/api/drawer/open`, { method: "POST", headers });
        return { success: response.ok, message: "Drawer opened" };
      }
      
      case "x_report":
      case "z_report": {
        const reportType = action === "x_report" ? "x" : "z";
        const response = await fetch(`${baseUrl}/api/report/${reportType}`, { method: "POST", headers });
        return { success: response.ok, message: `${reportType.toUpperCase()}-report printed` };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Shtrih-M error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Evotor driver implementation
async function evotorRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    switch (action) {
      case "test_connection": {
        const response = await fetch(`${baseUrl}/api/v1/devices/self`, { headers });
        return { success: response.ok, message: response.ok ? "Evotor connected" : "Connection failed" };
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        const positions = orderData.items.map(item => ({
          uuid: crypto.randomUUID(),
          name: item.name,
          price: item.price * 100, // in kopeks
          quantity: item.quantity * 1000, // in 0.001
          priceWithDiscount: item.total * 100,
        }));
        
        const receiptData = {
          type: "SELL",
          positions,
          payments: [{
            type: orderData.payment_method === "cash" ? "CASH" : "ELECTRON",
            value: orderData.total * 100,
          }],
        };
        
        const response = await fetch(`${baseUrl}/api/v1/documents/sell`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
        });
        
        return { success: response.ok, message: response.ok ? "Receipt printed" : "Print failed" };
      }
      
      case "open_drawer": {
        const response = await fetch(`${baseUrl}/api/v1/devices/self/cash-drawer`, { method: "POST", headers });
        return { success: response.ok, message: "Drawer opened" };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Evotor error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Newland driver implementation
async function newlandRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    switch (action) {
      case "test_connection": {
        const response = await fetch(`${baseUrl}/api/device/status`, { headers });
        if (response.ok) {
          return { success: true, message: "Newland connected" };
        }
        // Try alternative endpoint
        const altResponse = await fetch(`${baseUrl}/status`, { headers });
        return { success: altResponse.ok, message: altResponse.ok ? "Newland connected" : "Connection failed" };
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        const receiptData = {
          type: "sale",
          operator: settings?.operator_name || "Cashier",
          items: orderData.items.map((item, idx) => ({
            id: idx + 1,
            name: item.name,
            qty: item.quantity,
            price: item.price,
            amount: item.total,
          })),
          payment: {
            method: orderData.payment_method === "cash" ? 0 : 1,
            amount: orderData.total,
          },
          total: orderData.total,
          discount: orderData.discount,
        };
        
        const response = await fetch(`${baseUrl}/api/fiscal/receipt`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
        });
        
        if (response.ok) {
          return { success: true, message: "Receipt printed", data: await response.json().catch(() => ({})) };
        }
        throw new Error(`Print failed: ${response.status}`);
      }
      
      case "open_drawer": {
        const response = await fetch(`${baseUrl}/api/device/drawer`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "open" }),
        });
        return { success: response.ok, message: response.ok ? "Drawer opened" : "Failed" };
      }
      
      case "x_report":
      case "z_report": {
        const reportType = action === "x_report" ? "X" : "Z";
        const response = await fetch(`${baseUrl}/api/fiscal/report`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: reportType }),
        });
        return { success: response.ok, message: `${reportType}-report printed` };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Newland error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Aisino driver implementation
async function aisinoRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    switch (action) {
      case "test_connection": {
        const response = await fetch(`${baseUrl}/api/v1/device/info`, { headers });
        if (response.ok) {
          return { success: true, message: "Aisino connected" };
        }
        const altResponse = await fetch(`${baseUrl}/device/status`, { headers });
        return { success: altResponse.ok, message: altResponse.ok ? "Aisino connected" : "Connection failed" };
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        const receiptData = {
          invoiceType: "SALE",
          cashier: settings?.operator_name || "Cashier",
          companyTin: settings?.inn,
          companyName: settings?.company_name,
          items: orderData.items.map(item => ({
            description: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            totalAmount: item.total,
          })),
          payments: [{
            paymentType: orderData.payment_method === "cash" ? "CASH" : "CARD",
            amount: orderData.total,
          }],
          totalAmount: orderData.total,
          discountAmount: orderData.discount,
        };
        
        const response = await fetch(`${baseUrl}/api/v1/fiscal/invoice`, {
          method: "POST",
          headers,
          body: JSON.stringify(receiptData),
        });
        
        if (response.ok) {
          return { success: true, message: "Receipt printed", data: await response.json().catch(() => ({})) };
        }
        throw new Error(`Print failed: ${response.status}`);
      }
      
      case "open_drawer": {
        const response = await fetch(`${baseUrl}/api/v1/device/cashdrawer`, {
          method: "POST",
          headers,
          body: JSON.stringify({ command: "OPEN" }),
        });
        return { success: response.ok, message: response.ok ? "Drawer opened" : "Failed" };
      }
      
      case "x_report": {
        const response = await fetch(`${baseUrl}/api/v1/fiscal/report/x`, { method: "POST", headers });
        return { success: response.ok, message: "X-report printed" };
      }
      
      case "z_report": {
        const response = await fetch(`${baseUrl}/api/v1/fiscal/report/z`, { method: "POST", headers });
        return { success: response.ok, message: "Z-report printed" };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Aisino error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// HDM driver implementation (Armenian fiscal printers - ISP930, etc.)
// Based on iiko integration format
async function hdmRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const cashierId = settings?.api_login || "1";
  const cashierPin = settings?.api_password || "";
  const kkmPassword = settings?.kkm_password || "";
  const vatRate = settings?.vat_rate || 20;
  const timeout = settings?.default_timeout || 30000;
  
  // HDM uses specific auth headers
  const hdmHeaders: Record<string, string> = {
    ...headers,
    "Content-Type": "application/json",
  };

  try {
    switch (action) {
      case "test_connection": {
        // Try HDM status endpoint
        const loginData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
        };
        
        const response = await fetch(`${baseUrl}/api/login`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(loginData),
          signal: AbortSignal.timeout(timeout),
        });
        
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          return { success: true, message: "HDM connected", data };
        }
        
        // Try alternative status check
        const statusResponse = await fetch(`${baseUrl}/api/status`, {
          method: "GET",
          headers: hdmHeaders,
          signal: AbortSignal.timeout(timeout),
        });
        
        if (statusResponse.ok) {
          return { success: true, message: "HDM connected" };
        }
        
        throw new Error(`Status: ${response.status}`);
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        // HDM/iiko format for receipt
        const paymentTimeout = settings?.payment_timeout || 120000;
        const isCash = orderData.payment_method?.toLowerCase() === "cash" || 
                       orderData.payment_method?.toLowerCase() === "կdelays" ||
                       orderData.payment_method === "paidAmount";
        
        const receiptData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          receiptType: "sale",
          items: orderData.items.map((item, idx) => ({
            id: idx + 1,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: item.total,
            vatRate: vatRate,
            adgCode: "56.10", // Default ADG code for food service
            unit: "հdelays.", // Armenian: pieces
          })),
          payments: [{
            type: isCash ? "paidAmount" : "paidAmountCard",
            amount: orderData.total,
          }],
          total: orderData.total,
          discount: orderData.discount || 0,
          operator: settings?.operator_name || orderData.cashier_name,
          fiscalNumber: orderData.order_number,
        };
        
        const response = await fetch(`${baseUrl}/api/receipt`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(receiptData),
          signal: AbortSignal.timeout(paymentTimeout),
        });
        
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          return { success: true, message: "Receipt printed", data };
        }
        
        // Try alternative endpoint
        const altResponse = await fetch(`${baseUrl}/api/sale`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(receiptData),
          signal: AbortSignal.timeout(paymentTimeout),
        });
        
        if (altResponse.ok) {
          const data = await altResponse.json().catch(() => ({}));
          return { success: true, message: "Receipt printed", data };
        }
        
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Print failed: ${response.status} - ${errorText}`);
      }
      
      case "open_drawer": {
        const drawerData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          command: "openDrawer",
        };
        
        const response = await fetch(`${baseUrl}/api/drawer`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(drawerData),
          signal: AbortSignal.timeout(timeout),
        });
        
        if (response.ok) {
          return { success: true, message: "Drawer opened" };
        }
        
        // Try command endpoint
        const cmdResponse = await fetch(`${baseUrl}/api/command`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify({ ...drawerData, action: "openDrawer" }),
          signal: AbortSignal.timeout(timeout),
        });
        
        return { success: cmdResponse.ok, message: cmdResponse.ok ? "Drawer opened" : "Failed" };
      }
      
      case "x_report": {
        const reportData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          reportType: "X",
        };
        
        const response = await fetch(`${baseUrl}/api/report`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(reportData),
          signal: AbortSignal.timeout(timeout),
        });
        
        if (response.ok) {
          return { success: true, message: "X-report printed" };
        }
        throw new Error(`X-report failed: ${response.status}`);
      }
      
      case "z_report": {
        const reportData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          reportType: "Z",
        };
        
        const response = await fetch(`${baseUrl}/api/report`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(reportData),
          signal: AbortSignal.timeout(timeout),
        });
        
        if (response.ok) {
          return { success: true, message: "Z-report printed" };
        }
        throw new Error(`Z-report failed: ${response.status}`);
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`HDM error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Custom API (like Dines, etc.) - generic implementation
async function customApiRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    switch (action) {
      case "test_connection": {
        // Try common endpoints
        for (const endpoint of ["/status", "/api/status", "/health", "/ping", "/"]) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, { headers, method: "GET" });
            if (response.ok) {
              return { success: true, message: "API connected successfully" };
            }
          } catch {
            continue;
          }
        }
        return { success: false, message: "Could not connect to API" };
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("No order data");
        
        // Generic receipt format that should work with most APIs
        const receiptData = {
          action: "print_receipt",
          receipt: {
            number: orderData.order_number,
            date: orderData.date,
            cashier: orderData.cashier_name || settings?.operator_name,
            company: {
              name: settings?.company_name,
              inn: settings?.inn,
            },
            items: orderData.items.map(item => ({
              name: item.name,
              qty: item.quantity,
              price: item.price,
              sum: item.total,
            })),
            subtotal: orderData.subtotal,
            discount: orderData.discount,
            total: orderData.total,
            payment: {
              method: orderData.payment_method,
              amount: orderData.total,
            },
          },
        };
        
        // Try common receipt endpoints
        for (const endpoint of ["/print", "/api/print", "/receipt", "/api/receipt", "/fiscal/receipt"]) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: "POST",
              headers,
              body: JSON.stringify(receiptData),
            });
            
            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              return { success: true, message: "Receipt sent to printer", data };
            }
          } catch {
            continue;
          }
        }
        
        throw new Error("Could not print receipt - no valid endpoint found");
      }
      
      case "open_drawer": {
        for (const endpoint of ["/drawer", "/api/drawer", "/cash-drawer", "/api/cash-drawer"]) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: "POST",
              headers,
              body: JSON.stringify({ action: "open" }),
            });
            if (response.ok) {
              return { success: true, message: "Drawer command sent" };
            }
          } catch {
            continue;
          }
        }
        return { success: false, message: "Drawer endpoint not found" };
      }
      
      case "x_report":
      case "z_report": {
        const reportType = action.charAt(0);
        for (const endpoint of [`/report/${reportType}`, `/api/report/${reportType}`, `/${action}`]) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, { method: "POST", headers });
            if (response.ok) {
              return { success: true, message: `${reportType.toUpperCase()}-report command sent` };
            }
          } catch {
            continue;
          }
        }
        return { success: false, message: "Report endpoint not found" };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Custom API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
