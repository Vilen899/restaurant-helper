import { useState, useEffect } from "react";
import {
  Save,
  Wifi,
  Lock,
  Activity,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTypesEditor } from "@/components/admin/fiscal/PaymentTypesEditor";
import { FiscalReportsCard } from "@/components/admin/fiscal/FiscalReportsCard";
import { callFiscal } from "@/lib/fiscalApi";

// ПОЛНЫЙ ОРИГИНАЛЬНЫЙ ОБЪЕКТ XML
const XML_DEFAULTS = {
  Host: "192.168.9.19",
  Port: "8080",
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
  SubchargeAsDishName: "Հանրային սննdelays  կազdelays delays delays ",
  SubchargeAsDishAdgCode: "56.10",
  SubchargeAsDishUnit: "հdelays delays .",
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
    { Id: "09322f46-578a-d210-add7-eec222a08871", Name: "Կdelays delays ", UseExtPos: true, PaymentType: "paidAmount" },
    { Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241", Name: "Bank Cards", UseExtPos: false, PaymentType: "paidAmountCard" },
    { Id: "6dcb7577-458d-4215-b29f-08ee5dc3dbce", Name: "Glovo", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "c58e022d-96f2-4f50-b94f-3831f3c90265", Name: "Yandex", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "7a0ae73c-b12b-4025-9783-85a77156cbcb", Name: "Buy.Am", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "78c242fc-6fad-4ee6-9a44-7fbdfd54f7e5", Name: "Tel Cell", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "3859f307-61e4-4bcd-9314-757f831d8c23", Name: "Idram", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "9c4eebef-dd32-4883-ab1a-1d0854e75dcf", Name: "Հdelays delays delays delays ", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "27144aaf-e4ac-438e-9155-68280819edad", Name: "Առdelays delays  POS ов", UseExtPos: true, PaymentType: "paidAmountCard" },
  ],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<any>({ ...XML_DEFAULTS, location_id: "", driver: "hdm" });
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

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
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
    if (data) {
      setConfig({ ...XML_DEFAULTS, ...data, location_id: locId });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId });
    }
    setLoading(false);
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from("fiscal_settings").upsert({
        ...config,
        updated_at: new Date().toISOString(),
      });
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
    try {
      const result = await callFiscal("test_connection", config.location_id);
      if (result.success) {
        toast.success(`✅ ККМ ${config.Host}:${config.Port} подключена!`);
      } else {
        toast.error(`❌ ККМ не отвечает: ${result.message}`);
      }
    } catch (err: any) {
      toast.error(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Настройки ККМ</h1>
          <p className="text-muted-foreground">Подключение к ККМ через серверный прокси (без Mixed Content)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
            Тест связи
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Сохранить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="network" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="network"><Server className="w-4 h-4 mr-2" /> Связь</TabsTrigger>
          <TabsTrigger value="params"><Settings2 className="w-4 h-4 mr-2" /> Параметры</TabsTrigger>
          <TabsTrigger value="payments"><ShieldCheck className="w-4 h-4 mr-2" /> Оплаты</TabsTrigger>
          <TabsTrigger value="reports"><Activity className="w-4 h-4 mr-2" /> Отчеты</TabsTrigger>
        </TabsList>

        <TabsContent value="network">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Wifi className="w-5 h-5 text-primary" /> ККМ (Hardware)
              </div>
              <div className="space-y-2">
                <Label>IP Адрес ККМ</Label>
                <Input value={config.Host} onChange={(e) => setConfig({ ...config, Host: e.target.value })} placeholder="192.168.9.19" />
              </div>
              <div className="space-y-2">
                <Label>Порт ККМ</Label>
                <Input value={config.Port} onChange={(e) => setConfig({ ...config, Port: e.target.value })} placeholder="8080" />
              </div>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p>💡 Браузер (HTTPS) не может напрямую обращаться к ККМ по HTTP. Все запросы идут через серверную функцию, которая связывается с ККМ по IP без ограничений.</p>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Lock className="w-5 h-5 text-primary" /> Доступ
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cashier ID</Label>
                  <Input value={config.CashierId} onChange={(e) => setConfig({ ...config, CashierId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cashier PIN</Label>
                  <Input type="password" value={config.CashierPin} onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Пароль ККМ (Admin)</Label>
                <Input value={config.KkmPassword} onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="params">
          <Card className="p-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">ADG Коды</h3>
                <div className="space-y-2">
                  <Label>Стандартный ADG</Label>
                  <Input value={config.DefaultAdg} onChange={(e) => setConfig({ ...config, DefaultAdg: e.target.value })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Использовать по умолчанию</Label>
                  <Switch checked={config.UseDefaultAdg} onCheckedChange={(v) => setConfig({ ...config, UseDefaultAdg: v })} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">Наценки (Service)</h3>
                <div className="space-y-2">
                  <Label>Имя услуги</Label>
                  <Input value={config.SubchargeAsDishName} onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Код услуги</Label>
                  <Input value={config.SubchargeAsDishCode} onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">Таймауты (ms)</h3>
                <div className="space-y-2">
                  <Label>Операция</Label>
                  <Input type="number" value={config.DefaultOperationTimeout} onChange={(e) => setConfig({ ...config, DefaultOperationTimeout: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Оплата</Label>
                  <Input type="number" value={config.KkmPaymentTimeout} onChange={(e) => setConfig({ ...config, KkmPaymentTimeout: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="mt-4">
            <PaymentTypesEditor paymentTypes={config.PaymentTypes} onChange={(types) => setConfig({ ...config, PaymentTypes: types })} />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="mt-4">
            <FiscalReportsCard config={config} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
