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
import { Switch } from "@/components/ui/switch";
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
  SubchargeAsDishName: "Հանրային սննդի կազմակերպում",
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
  const [config, setConfig] = useState({ ...XML_DEFAULTS, location_id: "", LocalProxyUrl: "" });
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
      const paymentTypes = Array.isArray(data.PaymentTypes) ? data.PaymentTypes : XML_DEFAULTS.PaymentTypes;
      setConfig({
        ...XML_DEFAULTS,
        ...data,
        location_id: locId,
        LocalProxyUrl: data.local_proxy_url || data.LocalProxyUrl || "",
        Host: data.Host || data.host || data.ip_address || XML_DEFAULTS.Host,
        Port: data.Port || data.port || XML_DEFAULTS.Port,
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

      const payload = {
        ...restConfig,
        location_id: location_id,
        local_proxy_url: config.LocalProxyUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("fiscal_settings").upsert(payload);
      if (error) throw error;
      toast.success("Настройки успешно сохранены");
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus("idle");

    const pingUrl = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        await fetch(url, {
          method: "GET",
          signal: controller.signal,
          mode: "no-cors",
          // @ts-ignore
          targetAddressSpace: "private",
        });
        return true;
      } catch (e) {
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const targetUrl = config.LocalProxyUrl
      ? `${config.LocalProxyUrl}/api/v1/status`
      : `http://${config.Host}:${config.Port}/api/v1/status`;

    const isOk = await pingUrl(targetUrl);
    setConnectionStatus(isOk ? "online" : "offline");

    if (isOk) {
      toast.success("Соединение установлено!");
    } else {
      toast.error("Касса недоступна");
    }
    setIsTesting(false);
  };

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки ККМ</h1>
          <p className="text-muted-foreground">Конфигурация фискального регистратора</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
            Тест связи
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Сетевые настройки</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IP Адрес ККМ</Label>
              <Input value={config.Host} onChange={(e) => setConfig({ ...config, Host: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Порт</Label>
              <Input value={config.Port} onChange={(e) => setConfig({ ...config, Port: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-amber-600 flex items-center gap-1">
                Локальный Прокси (URL) <AlertTriangle className="h-3 w-3" />
              </Label>
              <Input
                value={config.LocalProxyUrl}
                onChange={(e) => setConfig({ ...config, LocalProxyUrl: e.target.value })}
                placeholder="http://localhost:3456"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 pb-2 border-b">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Статус</h2>
          </div>
          <div className="flex flex-col items-center py-4">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
                connectionStatus === "online"
                  ? "bg-green-100 text-green-600"
                  : connectionStatus === "offline"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              <Zap className="h-6 w-6" />
            </div>
            <p className="font-bold">
              {connectionStatus === "online" ? "ONLINE" : connectionStatus === "offline" ? "OFFLINE" : "WAITING"}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Авторизация</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>ID Кассира</Label>
            <Input value={config.CashierId} onChange={(e) => setConfig({ ...config, CashierId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>PIN Кассира</Label>
            <Input
              type="password"
              value={config.CashierPin}
              onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Пароль ККМ</Label>
            <Input
              type="password"
              value={config.KkmPassword}
              onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
