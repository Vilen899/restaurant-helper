import { useState, useEffect } from "react";
import {
  Save,
  Wifi,
  Zap,
  CreditCard,
  MapPin,
  Terminal,
  Lock,
  Database,
  ShieldCheck,
  Clock,
  Activity,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Server,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const XML_DEFAULTS = {
  Host: "192.168.8.169",
  Port: "8080",
  LocalProxyUrl: "",
  CashierId: "3",
  CashierPin: "4321",
  KkmPassword: "Aa1111Bb",
  VatRate: 16.67,
  UseDiscountInKkm: true,
  UseSubchargeAsDish: true,
  UseKitchenName: true,
  DefaultAdg: "56.10",
  UseDefaultAdg: true,
  UseDepartmentFromKitchenName: false,
  BonusPaymentName: "",
  C16CardIdTransfer: false,
  SubchargeAsDishCode: "999999",
  SubchargeAsDishName: "Հանրային սննդի կազմակерպում",
  SubchargeAsDishAdgCode: "56.10",
  SubchargeAsDishUnit: "հատ․",
  DefaultOperationTimeout: 30000,
  KkmPaymentTimeout: 120000,
  AdgCodeFromProductCodeLength: 1,
  AdgCodeFromProductFastCodeLength: 1,
  BackupDaysLimit: 14,
  VersionMajor: 0,
  VersionMinor: 7,
  AggregateSales: false,
  AggregateSaleName: "",
  AggregateSaleAdg: "",
  AggregateSaleCode: "",
  AggregateSaleUnit: "",
  DisableCashInOut: true,
  DoXReport: false,
  DoZReport: false,
  CounterToRelogin: 50,
  DebugMode: 1,
  Mode: "Manual",
  PaymentTypes: [
    { Id: "09322f46-578a-d210-add7-eec222a08871", Name: "Կանխիկ", UseExtPos: true, PaymentType: "paidAmount" },
    { Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241", Name: "Bank Cards", UseExtPos: false, PaymentType: "paidAmountCard" },
    { Id: "6dcb7577-458d-4215-b29f-08ee5dc3dbce", Name: "Glovo", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "c58e022d-96f2-4f50-b94f-3831f3c90265", Name: "Yandex", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "7a0ae73c-b12b-4025-9783-85a77156cbcb", Name: "Buy.Am", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "78c242fc-6fad-4ee6-9a44-7fbdfd54f7e5", Name: "Tel Cell", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "3859f307-61e4-4bcd-9314-757f831d8c23", Name: "Idram", UseExtPos: true, PaymentType: "paidAmountCard" },
    {
      Id: "9c4eebef-dd32-4883-ab1a-1d0854e75dcf",
      Name: "Հյուրասիրություն",
      UseExtPos: true,
      PaymentType: "paidAmountCard",
    },
    {
      Id: "27144aaf-e4ac-438e-9155-68280819edad",
      Name: "Առաքում POS ով",
      UseExtPos: true,
      PaymentType: "paidAmountCard",
    },
  ],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<any>({ ...XML_DEFAULTS, location_id: "", LocalProxyUrl: "" });
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "online" | "offline">("idle");

  useEffect(() => {
    async function init() {
      const { data: locData } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (locData?.length) {
        setLocations(locData);
        await loadSettings(locData[0].id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadSettings(locId: string) {
    setLoading(true);
    setConnectionStatus("idle");
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();

    if (data) {
      // Решаем проблему TS2322 и TS2339 через as any
      const rawData = data as any;
      const paymentTypes = Array.isArray(rawData.PaymentTypes) ? rawData.PaymentTypes : XML_DEFAULTS.PaymentTypes;

      setConfig({
        ...XML_DEFAULTS,
        ...rawData,
        location_id: locId,
        LocalProxyUrl: rawData.local_proxy_url || rawData.LocalProxyUrl || "",
        Host: rawData.Host || rawData.host || rawData.ip_address || XML_DEFAULTS.Host,
        Port: rawData.Port || rawData.port || XML_DEFAULTS.Port,
        PaymentTypes: paymentTypes,
      });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId, LocalProxyUrl: "" });
    }
    setLoading(false);
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      const { location_id, ...restConfig } = config;

      const payload: any = {
        ...restConfig,
        location_id: location_id,
        local_proxy_url: config.LocalProxyUrl, // Мапим вручную
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("fiscal_settings").upsert(payload);
      if (error) throw error;
      toast.success("Настройки сохранены");
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const pingUrl = async (url: string) => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        await fetch(url, {
          method: "GET",
          signal: controller.signal,
          mode: "no-cors",
          // @ts-ignore
          targetAddressSpace: "private",
        });
        clearTimeout(id);
        return true;
      } catch {
        return false;
      }
    };

    const target = config.LocalProxyUrl || `http://${config.Host}:${config.Port}/api/v1/status`;
    const isOk = await pingUrl(target);
    setConnectionStatus(isOk ? "online" : "offline");
    setIsTesting(false);
  };

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Настройки ККМ</h1>
          <p className="text-muted-foreground">Конфигурация регистратора</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
            Тест
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" /> Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Server className="h-5 w-5" />
            <h2 className="font-semibold">Сеть</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input value={config.Host} onChange={(e) => setConfig({ ...config, Host: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={config.Port} onChange={(e) => setConfig({ ...config, Port: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Proxy URL (для Mixed Content)</Label>
              <Input
                value={config.LocalProxyUrl}
                onChange={(e) => setConfig({ ...config, LocalProxyUrl: e.target.value })}
                placeholder="http://localhost:3456"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${connectionStatus === "online" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
            >
              <Zap />
            </div>
          </div>
          <p className="font-bold uppercase">{connectionStatus}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Lock className="h-5 w-5" />
          <h2 className="font-semibold">Авторизация</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input
            placeholder="ID"
            value={config.CashierId}
            onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
          />
          <Input
            placeholder="PIN"
            type="password"
            value={config.CashierPin}
            onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
          />
          <Input
            placeholder="Pass"
            type="password"
            value={config.KkmPassword}
            onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
}
