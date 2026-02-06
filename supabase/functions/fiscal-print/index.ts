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
  // HDM-specific fields (Armenian fiscal printers - from iiko XML config)
  Host?: string;
  Port?: string;
  CashierId?: string;
  CashierPin?: string;
  KkmPassword?: string;
  VatRate?: number;
  DefaultAdg?: string;
  UseDefaultAdg?: boolean;
  UseDiscountInKkm?: boolean;
  UseSubchargeAsDish?: boolean;
  UseKitchenName?: boolean;
  UseDepartmentFromKitchenName?: boolean;
  SubchargeAsDishCode?: string;
  SubchargeAsDishName?: string;
  SubchargeAsDishAdgCode?: string;
  SubchargeAsDishUnit?: string;
  DefaultOperationTimeout?: number;
  KkmPaymentTimeout?: number;
  BonusPaymentName?: string;
  C16CardIdTransfer?: boolean;
  AdgCodeFromProductCodeLength?: number;
  AdgCodeFromProductFastCodeLength?: number;
  BackupDaysLimit?: number;
  AggregateSales?: boolean;
  AggregateSaleName?: string;
  AggregateSaleAdg?: string;
  AggregateSaleCode?: string;
  AggregateSaleUnit?: string;
  DisableCashInOut?: boolean;
  DoXReport?: boolean;
  DoZReport?: boolean;
  CounterToRelogin?: number;
  DebugMode?: number;
  Mode?: string;
  PaymentTypes?: Array<{
    Id: string;
    Name: string;
    UseExtPos: boolean;
    PaymentType: string; // "paidAmount" for cash, "paidAmountCard" for card
  }>;
  // Legacy snake_case fields
  kkm_password?: string | null;
  vat_rate?: number | null;
  terminal_id?: string | null;
  default_timeout?: number | null;
  payment_timeout?: number | null;
  cashier_id?: string | null;
  cashier_pin?: string | null;
  default_adg?: string | null;
  host?: string | null;
  local_proxy_url?: string | null;
  LocalProxyUrl?: string | null;
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

// HDM driver implementation (Armenian fiscal printers - ISP930)
// Full iiko-compatible format based on the provided XML config
async function hdmRequest(
  baseUrl: string,
  headers: Record<string, string>,
  action: string,
  orderData?: PrintRequest["order_data"],
  settings?: FiscalSettings
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  // Extract HDM settings with iiko XML field names (prefer uppercase)
  const cashierId = settings?.CashierId || settings?.cashier_id || "3";
  const cashierPin = settings?.CashierPin || settings?.cashier_pin || "4321";
  const kkmPassword = settings?.KkmPassword || settings?.kkm_password || "Aa1111Bb";
  const vatRate = settings?.VatRate || settings?.vat_rate || 16.67;
  const defaultTimeout = settings?.DefaultOperationTimeout || settings?.default_timeout || 30000;
  const paymentTimeout = settings?.KkmPaymentTimeout || settings?.payment_timeout || 120000;
  const defaultAdg = settings?.DefaultAdg || settings?.default_adg || "56.10";
  const useDefaultAdg = settings?.UseDefaultAdg !== false;
  const useDiscountInKkm = settings?.UseDiscountInKkm !== false;
  const useSubchargeAsDish = settings?.UseSubchargeAsDish !== false;
  const useKitchenName = settings?.UseKitchenName !== false;
  const subchargeCode = settings?.SubchargeAsDishCode || "999999";
  const subchargeName = settings?.SubchargeAsDishName || "Հdelays sնdelays դdelays  կdelays delays մdelays delays delays delays ";
  const subchargeAdgCode = settings?.SubchargeAsDishAdgCode || "56.10";
  const subchargeUnit = settings?.SubchargeAsDishUnit || "delays delays .";
  const debugMode = settings?.DebugMode ?? 1;
  const mode = settings?.Mode || "Manual";
  
  // Get PaymentTypes from settings (iiko format)
  const paymentTypes = settings?.PaymentTypes || [];
  
  // Host and Port - iiko XML uses uppercase
  const host = settings?.Host || settings?.host || settings?.ip_address || "192.168.9.19";
  const port = settings?.Port || settings?.port || "8080";
  
  // Check for local proxy URL (for Mixed Content bypass)
  const localProxyUrl = settings?.LocalProxyUrl || settings?.local_proxy_url;
  
  // Build effective URL - prefer local proxy if configured
  const effectiveBaseUrl = localProxyUrl || settings?.api_url || `http://${host}:${port}`;
  
  console.log(`[HDM] Using URL: ${effectiveBaseUrl}, CashierId: ${cashierId}, Mode: ${mode}`);
  
  // HDM API headers
  const hdmHeaders: Record<string, string> = {
    ...headers,
    "Content-Type": "application/json",
  };

  try {
    switch (action) {
      case "test_connection": {
        console.log(`[HDM] test_connection to ${effectiveBaseUrl}`);
        
        // HDM login/status check
        const loginData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
        };
        
        // Try multiple endpoints used by HDM/ISP930
        const endpoints = [
          { url: "/api/v1/status", method: "GET", body: null },
          { url: "/api/login", method: "POST", body: loginData },
          { url: "/api/status", method: "GET", body: null },
          { url: "/status", method: "GET", body: null },
          { url: "/", method: "GET", body: null },
        ];
        
        for (const ep of endpoints) {
          try {
            const fetchOptions: RequestInit = {
              method: ep.method,
              headers: hdmHeaders,
              signal: AbortSignal.timeout(defaultTimeout),
            };
            
            if (ep.body && ep.method === "POST") {
              fetchOptions.body = JSON.stringify(ep.body);
            }
            
            const response = await fetch(`${effectiveBaseUrl}${ep.url}`, fetchOptions);
            
            if (response.ok || response.status < 500) {
              const data = await response.json().catch(() => ({ status: "ok" }));
              console.log(`[HDM] Connected via ${ep.url}`);
              return { 
                success: true, 
                message: `HDM connected (${host}:${port})`, 
                data: { endpoint: ep.url, ...data }
              };
            }
          } catch (err) {
            console.log(`[HDM] Endpoint ${ep.url} failed:`, err);
            continue;
          }
        }
        
        throw new Error(`HDM недоступен: ${effectiveBaseUrl}`);
      }
      
      case "print_receipt": {
        if (!orderData) throw new Error("Нет данных заказа");
        
        console.log(`[HDM] print_receipt #${orderData.order_number}`);
        
        // Determine payment type from PaymentTypes config (iiko format)
        const paymentMethodLower = (orderData.payment_method || "").toLowerCase();
        let fiscalPaymentType = "paidAmountCard"; // default to card
        let useExtPos = true;
        
        // Match payment method against configured PaymentTypes
        for (const pt of paymentTypes) {
          const ptNameLower = pt.Name.toLowerCase();
          if (paymentMethodLower.includes(ptNameLower) || 
              ptNameLower.includes(paymentMethodLower) ||
              paymentMethodLower === "cash" && pt.PaymentType === "paidAmount") {
            fiscalPaymentType = pt.PaymentType;
            useExtPos = pt.UseExtPos;
            break;
          }
        }
        
        // Check for cash payment
        const isCash = fiscalPaymentType === "paidAmount" ||
                       paymentMethodLower === "cash" ||
                       paymentMethodLower === "կdelays delays " ||
                       paymentMethodLower === "naличные" ||
                       paymentMethodLower === "наличные";
        
        if (isCash) {
          fiscalPaymentType = "paidAmount";
        }
        
        // Format items for HDM (Armenian fiscal receipt format)
        const formattedItems = orderData.items.map((item, idx) => ({
          id: idx + 1,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: item.total,
          vatRate: vatRate,
          adgCode: useDefaultAdg ? defaultAdg : "56.10",
          productCode: String(idx + 1).padStart(4, "0"),
          unit: "delays delays .", // pieces
          // Kitchen name support (for multi-department)
          kitchenName: useKitchenName ? item.name : undefined,
        }));
        
        // Apply discount handling
        let discountItem = null;
        if (orderData.discount > 0 && useDiscountInKkm) {
          // HDM can handle discounts inline or as separate line
          formattedItems.forEach(item => {
            (item as any).discount = (item.amount / orderData.subtotal) * orderData.discount;
          });
        }
        
        // Handle subcharge as dish (service fee) if enabled
        if (useSubchargeAsDish && orderData.subtotal !== orderData.total) {
          // Add service charge as a dish item
          const serviceCharge = orderData.total - orderData.subtotal + orderData.discount;
          if (serviceCharge > 0) {
            formattedItems.push({
              id: formattedItems.length + 1,
              name: subchargeName,
              quantity: 1,
              price: serviceCharge,
              amount: serviceCharge,
              vatRate: vatRate,
              adgCode: subchargeAdgCode,
              productCode: subchargeCode,
              unit: subchargeUnit,
              kitchenName: undefined,
            });
          }
        }
        
        // Build receipt data in iiko-compatible format
        const receiptData = {
          // Cashier authentication (from XML config)
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          
          // Receipt type
          receiptType: "sale",
          documentType: 3, // Վdelay delays = Sale
          
          // Items
          items: formattedItems,
          
          // Payment (iiko PaymentTypes format)
          payments: [{
            type: fiscalPaymentType,
            paymentType: isCash ? 0 : 1,
            amount: orderData.total,
            useExtPos: useExtPos,
          }],
          
          // Totals
          subtotal: orderData.subtotal,
          discount: useDiscountInKkm ? (orderData.discount || 0) : 0,
          total: orderData.total,
          
          // Operator info
          operator: orderData.cashier_name || settings?.operator_name,
          
          // Receipt metadata
          receiptNumber: orderData.order_number,
          date: orderData.date,
          
          // VAT
          vatRate: vatRate,
          
          // Mode from config
          mode: mode,
          debugMode: debugMode,
          
          // Company info
          companyName: settings?.company_name,
          inn: settings?.inn,
          terminalId: settings?.terminal_id,
        };
        
        // Try HDM endpoints
        const printEndpoints = [
          "/api/v1/receipt",
          "/api/receipt",
          "/api/sale",
          "/api/fiscal/receipt",
        ];
        
        for (const endpoint of printEndpoints) {
          try {
            console.log(`[HDM] Trying ${endpoint}...`);
            const response = await fetch(`${effectiveBaseUrl}${endpoint}`, {
              method: "POST",
              headers: hdmHeaders,
              body: JSON.stringify(receiptData),
              signal: AbortSignal.timeout(paymentTimeout),
            });
            
            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              console.log(`[HDM] Receipt printed via ${endpoint}`);
              return { success: true, message: "Чек напечатан", data };
            }
          } catch (err) {
            console.log(`[HDM] Endpoint ${endpoint} failed:`, err);
            continue;
          }
        }
        
        throw new Error("Не удалось напечатать чек");
      }
      
      case "open_drawer": {
        console.log(`[HDM] open_drawer`);
        
        const drawerData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          command: "openDrawer",
        };
        
        for (const endpoint of ["/api/drawer", "/api/v1/drawer", "/api/command"]) {
          try {
            const response = await fetch(`${effectiveBaseUrl}${endpoint}`, {
              method: "POST",
              headers: hdmHeaders,
              body: JSON.stringify(drawerData),
              signal: AbortSignal.timeout(defaultTimeout),
            });
            
            if (response.ok) {
              return { success: true, message: "Денежный ящик открыт" };
            }
          } catch (err) {
            continue;
          }
        }
        
        throw new Error("Не удалось открыть денежный ящик");
      }
      
      case "x_report": {
        console.log(`[HDM] x_report`);
        
        // Check if X-report is enabled in config
        if (settings?.DoXReport === false) {
          return { success: true, message: "X-отчёт отключён в настройках" };
        }
        
        const reportData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          reportType: "X",
        };
        
        const response = await fetch(`${effectiveBaseUrl}/api/report`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(reportData),
          signal: AbortSignal.timeout(defaultTimeout),
        });
        
        if (response.ok) {
          return { success: true, message: "X-отчёт напечатан" };
        }
        throw new Error(`X-отчёт не выполнен: ${response.status}`);
      }
      
      case "z_report": {
        console.log(`[HDM] z_report`);
        
        // Check if Z-report is enabled in config
        if (settings?.DoZReport === false) {
          return { success: true, message: "Z-отчёт отключён в настройках" };
        }
        
        const reportData = {
          cashierId: parseInt(cashierId),
          cashierPin: cashierPin,
          password: kkmPassword,
          reportType: "Z",
        };
        
        const response = await fetch(`${effectiveBaseUrl}/api/report`, {
          method: "POST",
          headers: hdmHeaders,
          body: JSON.stringify(reportData),
          signal: AbortSignal.timeout(defaultTimeout),
        });
        
        if (response.ok) {
          return { success: true, message: "Z-отчёт напечатан" };
        }
        throw new Error(`Z-отчёт не выполнен: ${response.status}`);
      }
      
      default:
        throw new Error(`Неизвестное действие: ${action}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[HDM] Error: ${msg}`);
    throw new Error(`HDM: ${msg}`);
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
