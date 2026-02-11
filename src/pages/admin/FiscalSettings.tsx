import { useState, useEffect } from "react";
import {
  Save,
  Wifi,
  Zap,
  Terminal,
  Lock,
  Activity,
  RefreshCw,
  ExternalLink,
  Server,
  Cpu,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTypesEditor } from "@/components/admin/fiscal/PaymentTypesEditor";
import { FiscalReportsCard } from "@/components/admin/fiscal/FiscalReportsCard";

// 1. СТРОГОЕ СООТВЕТСТВИЕ СТРУКТУРЕ XML (ТВОЙ ОРИГИНАЛ)
const XML_DEFAULTS = {
  Host: "192.168.9.19",
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

// Supported KKM Drivers
const KKM_DRIVERS = [
  { value: "hdm", label: "HDM (ISP930)", description: "Армянский фискальный регистратор" },
  { value: "atol", label: "ATOL", description: "Российский драйвер ATOL" },
  { value: "shtrih", label: "Shtrih-M", description: "Штрих-М ФР" },
  { value: "evotor", label: "Evotor", description: "Смарт-терминал Эвотор" },
  { value: "custom", label: "Custom API", description: "Пользовательский API" },
];

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<any>({ ...XML_DEFAULTS, location_id: "", LocalProxyUrl: "", driver: "hdm" });
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "online" | "offline">("idle");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data?.length) {
        setLocations(data);
        await loadSettings(data[0].id);
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
      const dbData = data as any;
      const paymentTypes = Array.isArray(dbData.PaymentTypes) ? dbData.PaymentTypes : XML_DEFAULTS.PaymentTypes;

      setConfig({
        ...XML_DEFAULTS,
        ...dbData,
        location_id: locId,
        // Мапим варианты имен полей из БД (для поддержки старых миграций)
        Host: dbData.Host ?? dbData.ip_address ?? dbData.host ?? XML_DEFAULTS.Host,
        Port: dbData.Port ?? dbData.port ?? XML_DEFAULTS.Port,
        LocalProxyUrl: dbData.local_proxy_url ?? dbData.LocalProxyUrl ?? "",
        PaymentTypes: paymentTypes,
      });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId });
    }
    setLoading(false);
  }

  // СОХРАНЕНИЕ ВСЕХ ПАРАМЕТРОВ
  const handleSave = async () => {
    try {
      setLoading(true);
      const { location_id, ...restConfig } = config;

      const payload: any = {
        ...restConfig,
        location_id,
        // Явный маппинг для избежания ошибки Schema Cache
        local_proxy_url: config.LocalProxyUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("fiscal_settings").upsert(payload);
      if (error) throw error;
      toast.success("Настройки успешно сохранены");
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus("idle");

    // Браузер на HTTPS НЕ МОЖЕТ обратиться к HTTP напрямую (Mixed Content).
    // Единственный способ — через Local Proxy на кассовом ПК.
    if (!config.LocalProxyUrl) {
      setConnectionStatus("offline");
      toast.error(
        "❌ Для подключения к ККМ из браузера необходим Local Proxy.\n" +
        "Запустите scripts/kkm-proxy.js на кассовом ПК и укажите http://localhost:3456",
        { duration: 8000 }
      );
      setIsTesting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${config.LocalProxyUrl}/api/v1/status`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok || response.status < 500) {
        setConnectionStatus("online");
        toast.success(`✅ ККМ доступна через Proxy (${config.LocalProxyUrl} → ${config.Host}:${config.Port})`);
      } else {
        setConnectionStatus("offline");
        const text = await response.text().catch(() => "");
        toast.error(`❌ ККМ ответила ошибкой ${response.status}: ${text}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setConnectionStatus("offline");
      if (err.name === "AbortError") {
        toast.error("❌ Таймаут подключения к Proxy. Убедитесь что kkm-proxy.js запущен.");
      } else {
        toast.error(`❌ Proxy недоступен: ${err.message}. Запустите: node scripts/kkm-proxy.js`);
      }
    }

    setIsTesting(false);
  };

  const handleAutoDetect = async () => {
    setIsTesting(true);
    toast.info("🔍 Проверка подключения через Local Proxy...");

    if (!config.LocalProxyUrl) {
      // Подставляем дефолтный proxy URL
      const defaultProxy = "http://localhost:3456";
      setConfig({ ...config, LocalProxyUrl: defaultProxy });
      toast.info(`Установлен Local Proxy URL: ${defaultProxy}. Убедитесь что kkm-proxy.js запущен.`);
      setIsTesting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const start = Date.now();
      const response = await fetch(`${config.LocalProxyUrl}/api/v1/status`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (response.ok || response.status < 500) {
        setConnectionStatus("online");
        toast.success(`✅ ККМ подключена через Proxy (${latency}ms)`);
      } else {
        setConnectionStatus("offline");
        toast.error(`❌ ККМ ответила ошибкой: ${response.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setConnectionStatus("offline");
      toast.error(
        "❌ Proxy недоступен. Инструкция:\n" +
        "1) На кассовом ПК: node scripts/kkm-proxy.js\n" +
        "2) В настройках: http://localhost:3456",
        { duration: 10000 }
      );
    }

    setIsTesting(false);
  };

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки ККМ</h1>
          <p className="text-muted-foreground">Полная конфигурация чека и сетевых параметров</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleAutoDetect} disabled={isTesting}>
            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Авто-определение
          </Button>
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
            Тест связи
          </Button>
          <Button onClick={handleSave} className="bg-primary">
            <Save className="mr-2 h-4 w-4" /> Сохранить
          </Button>
        </div>
      </div>

      {/* DRIVER SELECTION */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Драйвер ККМ</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Выберите драйвер</Label>
            <Select value={config.driver || "hdm"} onValueChange={(v) => setConfig({ ...config, driver: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите драйвер ККМ" />
              </SelectTrigger>
              <SelectContent>
                {KKM_DRIVERS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <p className="text-sm text-muted-foreground pt-2">
              {KKM_DRIVERS.find((d) => d.value === config.driver)?.description || "Выберите драйвер"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* СЕТЬ */}
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
              <Label className="text-destructive font-bold">⚠ Local Proxy URL (ОБЯЗАТЕЛЬНО)</Label>
              <Input
                value={config.LocalProxyUrl}
                onChange={(e) => setConfig({ ...config, LocalProxyUrl: e.target.value })}
                placeholder="http://localhost:3456"
                className={!config.LocalProxyUrl ? "border-destructive" : "border-green-500"}
              />
              <div className="text-xs space-y-1 p-3 rounded-lg bg-muted border">
                <p className="font-semibold text-foreground">Почему нужен Proxy?</p>
                <p className="text-muted-foreground">Браузер (HTTPS) <strong>не может</strong> обращаться к ККМ по HTTP напрямую — это блокируется Mixed Content. iiko работает потому что это десктопное приложение.</p>
                <p className="font-semibold text-foreground mt-2">Инструкция (один раз):</p>
                <p className="text-muted-foreground">1. Скопируйте <code className="bg-background px-1 rounded">scripts/kkm-proxy.js</code> на кассовый ПК</p>
                <p className="text-muted-foreground">2. Запустите: <code className="bg-background px-1 rounded">KKM_HOST={config.Host} KKM_PORT={config.Port} node kkm-proxy.js</code></p>
                <p className="text-muted-foreground">3. Укажите здесь: <code className="bg-background px-1 rounded">http://localhost:3456</code></p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = config.LocalProxyUrl
                  ? `${config.LocalProxyUrl}/api/v1/status`
                  : `http://${config.Host}:${config.Port}/api/v1/status`;
                window.open(url, "_blank");
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть статус ККМ
            </Button>
          </div>
        </Card>

        {/* СТАТУС */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Статус</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                connectionStatus === "online"
                  ? "bg-green-100 text-green-600"
                  : connectionStatus === "offline"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              <Zap className="h-8 w-8" />
            </div>
            <p className="font-bold text-lg">{connectionStatus.toUpperCase()}</p>
          </div>
        </Card>
      </div>

      {/* АВТОРИЗАЦИЯ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Авторизация</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>ID Кассира</Label>
            <Input value={config.CashierId} onChange={(e) => setConfig({ ...config, CashierId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>PIN</Label>
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

      {/* ДОПОЛНИТЕЛЬНЫЕ ПАРАМЕТРЫ (ТВОИ ADG, VAT И Т.Д.) */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Terminal className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Параметры ADG и Чека</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>НДС (%)</Label>
            <Input
              type="number"
              value={config.VatRate}
              onChange={(e) => setConfig({ ...config, VatRate: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>ADG по умолчанию</Label>
            <Input value={config.DefaultAdg} onChange={(e) => setConfig({ ...config, DefaultAdg: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Код блюда (Subcharge)</Label>
            <Input
              value={config.SubchargeAsDishCode}
              onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Таймаут (мс)</Label>
            <Input
              type="number"
              value={config.DefaultOperationTimeout}
              onChange={(e) => setConfig({ ...config, DefaultOperationTimeout: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      {/* ФИСКАЛЬНЫЕ ОТЧЁТЫ */}
      <FiscalReportsCard config={config} />

      {/* СПОСОБЫ ОПЛАТЫ */}
      <PaymentTypesEditor
        paymentTypes={config.PaymentTypes || []}
        onChange={(paymentTypes) => setConfig({ ...config, PaymentTypes: paymentTypes })}
      />
    </div>
  );
}
