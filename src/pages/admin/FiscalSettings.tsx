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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [config, setConfig] = useState({ ...XML_DEFAULTS, location_id: "" });
  const [locations, setLocations] = useState([]);
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

  async function loadSettings(locId) {
    setLoading(true);
    setConnectionStatus("idle");
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();

    if (data) {
      setConfig({ ...XML_DEFAULTS, ...data, location_id: locId });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId });
    }
    setLoading(false);
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus("idle");
    const targetUrl = `http://${config.Host}:${config.Port}/api/v1/status`;

    console.log("📡 Тестируем:", targetUrl);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        // mode: "no-cors" УБРАН для корректной проверки
      });

      console.log("✅ Успех:", response.status);
      setConnectionStatus("online");
      toast.success("ККМ в сети!");
    } catch (error: any) {
      console.error("❌ Ошибка теста:", error);
      setConnectionStatus("offline");

      if (error.name === "AbortError") {
        toast.error("Превышено время ожидания (Таймаут)");
      } else {
        toast.error("Нет доступа к кассе. Проверьте CORS и IP.");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: "location_id" });
    if (!error) {
      toast.success("Настройки сохранены в БД");
    } else {
      toast.error(error.message);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-emerald-500 italic tracking-widest">
        LOADING_MANIFEST...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">HDM Driver Manifest</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <MapPin className="h-3 w-3" />
                <select
                  className="bg-transparent border-none outline-none text-emerald-500"
                  value={config.location_id}
                  onChange={(e) => loadSettings(e.target.value)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-slate-900">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <Button
            onClick={save}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 h-12 rounded-xl text-[11px] tracking-widest transition-all"
          >
            <Save className="mr-2 h-4 w-4" /> SAVE TO DATABASE
          </Button>
        </div>

        {/* CONNECTION & AUTH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-blue-500 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-blue-500">
                <Wifi className="h-4 w-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Connection</h3>
              </div>
              <div
                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  connectionStatus === "online"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : connectionStatus === "offline"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-slate-800 text-slate-500"
                }`}
              >
                {connectionStatus === "idle" ? "Wait Test" : connectionStatus}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Host</Label>
                  <Input
                    value={config.Host}
                    onChange={(e) => setConfig({ ...config, Host: e.target.value })}
                    className="bg-slate-950 font-mono text-blue-400 border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Port</Label>
                  <Input
                    value={config.Port}
                    onChange={(e) => setConfig({ ...config, Port: e.target.value })}
                    className="bg-slate-950 font-mono text-blue-400 border-slate-800"
                  />
                </div>
              </div>
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                variant="outline"
                className="w-full border-blue-500/30 bg-blue-500/5 text-blue-400 text-[10px] font-bold h-9 gap-2"
              >
                {isTesting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                {isTesting ? "CONNECTING..." : "TEST KKM CONNECTION"}
              </Button>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-emerald-500 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-emerald-500">
              <Lock className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Cashier Auth</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] text-slate-500 uppercase">ID</Label>
                <Input
                  value={config.CashierId}
                  onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-slate-500 uppercase">PIN</Label>
                <Input
                  value={config.CashierPin}
                  onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-amber-500 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-amber-500">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Logic Flags</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Discount", key: "UseDiscountInKkm" },
                { label: "Subcharge", key: "UseSubchargeAsDish" },
                { label: "Kitchen", key: "UseKitchenName" },
                { label: "Def. ADG", key: "UseDefaultAdg" },
              ].map((f) => (
                <div
                  key={f.key}
                  className="flex flex-col gap-2 p-2 bg-black/30 rounded-lg border border-slate-800 items-center"
                >
                  <span className="text-[8px] font-black uppercase text-slate-500">{f.label}</span>
                  <Switch checked={config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* PAYMENT TYPES */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Mapping
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-black/60 text-slate-500 uppercase text-[9px]">
              <tr>
                <th className="p-4 text-left">Label</th>
                <th className="p-4 text-left">Internal UUID</th>
                <th className="p-4 text-center">Ext POS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {config.PaymentTypes.map((pt, idx) => (
                <tr key={idx} className="hover:bg-emerald-900/5 transition-colors">
                  <td className="p-4 font-bold text-white italic">{pt.Name}</td>
                  <td className="p-4 font-mono text-slate-500 text-[10px]">{pt.Id}</td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={pt.UseExtPos}
                      onCheckedChange={(v) => {
                        const upd = [...config.PaymentTypes];
                        upd[idx].UseExtPos = v;
                        setConfig({ ...config, PaymentTypes: upd });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
