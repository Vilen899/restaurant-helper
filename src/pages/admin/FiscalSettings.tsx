import { useState, useEffect } from "react";
import {
  Save,
  Cpu,
  Wifi,
  Zap,
  CreditCard,
  Plus,
  Trash2,
  MapPin,
  Settings,
  ShieldCheck,
  Database,
  Terminal,
  FileText,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// --- СТРУКТУРА ПЛАТЕЖЕЙ ИЗ XML ---
interface PaymentTypeItem {
  Id: string;
  Name: string;
  UseExtPos: boolean;
  PaymentType: "paidAmount" | "paidAmountCard";
  enabled: boolean;
}

// --- ПОЛНАЯ СТРУКТУРА ВСЕХ ТЕГОВ XML ---
interface FullXmlConfig {
  location_id: string;
  Host: string;
  Port: string;
  CashierId: string;
  CashierPin: string;
  KkmPassword: string;
  VatRate: number;
  UseDiscountInKkm: boolean;
  UseSubchargeAsDish: boolean;
  UseKitchenName: boolean;
  DefaultAdg: string;
  UseDefaultAdg: boolean;
  UseDepartmentFromKitchenName: boolean;
  BonusPaymentName: string;
  C16CardIdTransfer: boolean;
  SubchargeAsDishCode: string;
  SubchargeAsDishName: string;
  SubchargeAsDishAdgCode: string;
  SubchargeAsDishUnit: string;
  DefaultOperationTimeout: number;
  KkmPaymentTimeout: number;
  AdgCodeFromProductCodeLength: number;
  AdgCodeFromProductFastCodeLength: number;
  BackupDaysLimit: number;
  VersionMajor: number;
  VersionMinor: number;
  AggregateSales: boolean;
  AggregateSaleName: string;
  AggregateSaleAdg: string;
  AggregateSaleCode: string;
  AggregateSaleUnit: string;
  DisableCashInOut: boolean;
  DoXReport: boolean;
  DoZReport: boolean;
  CounterToRelogin: number;
  DebugMode: number;
  Mode: string;
  PaymentTypes: PaymentTypeItem[];
}

// --- ДЕФОЛТНЫЕ ЗНАЧЕНИЯ ИЗ ТВОЕГО ФАЙЛА ---
const xmlDefaultPayments: PaymentTypeItem[] = [
  {
    Id: "09322f46-578a-d210-add7-eec222a08871",
    Name: "Կանխիկ",
    UseExtPos: true,
    PaymentType: "paidAmount",
    enabled: true,
  },
  {
    Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241",
    Name: "Bank Cards",
    UseExtPos: false,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "6dcb7577-458d-4215-b29f-08ee5dc3dbce",
    Name: "Glovo",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "c58e022d-96f2-4f50-b94f-3831f3c90265",
    Name: "Yandex",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "7a0ae73c-b12b-4025-9783-85a77156cbcb",
    Name: "Buy.Am",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "78c242fc-6fad-4ee6-9a44-7fbdfd54f7e5",
    Name: "Tel Cell",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "3859f307-61e4-4bcd-9314-757f831d8c23",
    Name: "Idram",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "9c4eebef-dd32-4883-ab1a-1d0854e75dcf",
    Name: "Հյուրասիրություն",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
  {
    Id: "27144aaf-e4ac-438e-9155-68280819edad",
    Name: "Առաքում POS ով",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
    enabled: true,
  },
];

const initialConfig: FullXmlConfig = {
  location_id: "",
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
  PaymentTypes: xmlDefaultPayments,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullXmlConfig>(initialConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
        if (data?.length) {
          setLocations(data);
          await loadSettings(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Initialization error:", e);
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadSettings(locId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
      if (data) {
        const dbData = data as any;
        // Проверка на корректность PaymentTypes, чтобы не было ошибки .map()
        const validatedPayments = Array.isArray(dbData.PaymentTypes)
          ? dbData.PaymentTypes
          : Array.isArray(dbData.payment_types)
            ? dbData.payment_types
            : xmlDefaultPayments;

        setConfig({
          ...initialConfig,
          ...dbData,
          location_id: locId,
          PaymentTypes: validatedPayments,
        });
      } else {
        setConfig({ ...initialConfig, location_id: locId, PaymentTypes: xmlDefaultPayments });
      }
    } catch (err) {
      console.error("Load error:", err);
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  const save = async () => {
    try {
      const { error } = await supabase.from("fiscal_settings").upsert(
        {
          ...config,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "location_id" },
      );

      if (!error) toast.success("XML данные успешно синхронизированы");
      else throw error;
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message}`);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-emerald-500 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
        <p className="tracking-[0.5em] animate-pulse uppercase text-xs">Loading Fiscal Manifest...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 pb-32 font-sans tracking-tight">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* HEADER PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-600 rounded-2xl shadow-emerald-500/20 shadow-lg">
              <Terminal className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">
                HDM Driver Manager{" "}
                <span className="text-emerald-500 text-xs ml-2 not-italic tracking-widest font-mono">
                  v{config.VersionMajor}.{config.VersionMinor}
                </span>
              </h1>
              <div className="flex items-center gap-3 mt-1 font-bold text-slate-400">
                <MapPin className="h-3 w-3 text-emerald-500" />
                <Select value={config.location_id} onValueChange={loadSettings}>
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto text-blue-400 focus:ring-0 uppercase text-[10px] tracking-[0.2em]">
                    <SelectValue placeholder="Select Point" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button
            onClick={save}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 h-14 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px]"
          >
            <Save className="mr-3 h-5 w-5" /> Sync to Point
          </Button>
        </div>

        {/* 1. PAYMENT TYPES REGISTRY */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="bg-slate-900/40 border-b border-slate-800 p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
              <CreditCard className="h-4 w-4" /> PaymentTypes (XML List)
            </CardTitle>
            <Button
              onClick={() =>
                setConfig({
                  ...config,
                  PaymentTypes: [
                    ...(config.PaymentTypes || []),
                    { Id: "", Name: "New Method", UseExtPos: true, PaymentType: "paidAmountCard", enabled: true },
                  ],
                })
              }
              variant="outline"
              className="border-slate-700 h-8 text-[9px] font-bold px-4 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-2" /> ADD ROW
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/60 text-slate-500 uppercase text-[9px] font-black">
                <tr>
                  <th className="p-4 text-center w-20">Active</th>
                  <th className="p-4 text-left">Display Name</th>
                  <th className="p-4 text-left">UUID / ID</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-center w-20">ExtPos</th>
                  <th className="p-4 text-center w-16">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(config.PaymentTypes || []).map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`transition-all ${!pt.enabled ? "opacity-25 grayscale bg-black" : "hover:bg-emerald-900/5"}`}
                  >
                    <td className="p-4 text-center">
                      <Switch
                        checked={pt.enabled}
                        onCheckedChange={(v) => {
                          const upd = [...config.PaymentTypes];
                          upd[idx].enabled = v;
                          setConfig({ ...config, PaymentTypes: upd });
                        }}
                      />
                    </td>
                    <td className="p-4 font-bold text-white uppercase text-[11px]">
                      <Input
                        value={pt.Name}
                        onChange={(e) => {
                          const upd = [...config.PaymentTypes];
                          upd[idx].Name = e.target.value;
                          setConfig({ ...config, PaymentTypes: upd });
                        }}
                        className="bg-slate-950/50 border-slate-800 h-9 font-bold"
                      />
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-400">
                      <Input
                        value={pt.Id}
                        onChange={(e) => {
                          const upd = [...config.PaymentTypes];
                          upd[idx].Id = e.target.value;
                          setConfig({ ...config, PaymentTypes: upd });
                        }}
                        className="bg-slate-950/50 border-slate-800 h-9 text-slate-400"
                      />
                    </td>
                    <td className="p-4">
                      <Select
                        value={pt.PaymentType}
                        onValueChange={(v: any) => {
                          const upd = [...config.PaymentTypes];
                          upd[idx].PaymentType = v;
                          setConfig({ ...config, PaymentTypes: upd });
                        }}
                      >
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 h-9 text-[10px] font-black uppercase tracking-tighter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">paidAmount (Cash)</SelectItem>
                          <SelectItem value="paidAmountCard">paidAmountCard (Card)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
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
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setConfig({ ...config, PaymentTypes: config.PaymentTypes.filter((_, i) => i !== idx) })
                        }
                        className="h-8 w-8 text-slate-700 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2. GRID CONFIGURATION BLOCKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* BLOCK: NETWORK & HARDWARE */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 space-y-4 rounded-3xl border-l-4 border-l-blue-600 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-2 tracking-widest">
              <Wifi className="h-4 w-4" /> Network & Timeouts
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[8px] text-slate-500 font-black">HOST IP</Label>
                  <Input
                    value={config.Host}
                    onChange={(e) => setConfig({ ...config, Host: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10 font-mono text-xs text-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[8px] text-slate-500 font-black">PORT</Label>
                  <Input
                    value={config.Port}
                    onChange={(e) => setConfig({ ...config, Port: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10 font-mono text-xs text-blue-400"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-500 font-black italic">DefaultOperationTimeout</Label>
                <Input
                  type="number"
                  value={config.DefaultOperationTimeout}
                  onChange={(e) => setConfig({ ...config, DefaultOperationTimeout: parseInt(e.target.value) })}
                  className="bg-slate-950 border-slate-800 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-500 font-black italic">KkmPaymentTimeout</Label>
                <Input
                  type="number"
                  value={config.KkmPaymentTimeout}
                  onChange={(e) => setConfig({ ...config, KkmPaymentTimeout: parseInt(e.target.value) })}
                  className="bg-slate-950 border-slate-800 h-9"
                />
              </div>
            </div>
          </Card>

          {/* BLOCK: FISCAL AUTH */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 space-y-4 rounded-3xl border-l-4 border-l-emerald-600 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2 tracking-widest">
              <Lock className="h-4 w-4" /> KKM Auth Registry
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-500 font-black">CASHIER ID</Label>
                <Input
                  value={config.CashierId}
                  onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
                  className="bg-slate-950 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-500 font-black">CASHIER PIN</Label>
                <Input
                  value={config.CashierPin}
                  onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
                  className="bg-slate-950 h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] text-slate-500 font-black uppercase tracking-widest">KkmPassword</Label>
              <Input
                value={config.KkmPassword}
                onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })}
                className="bg-slate-950 border-slate-800 h-10 text-emerald-500 font-bold"
              />
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-slate-800 flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-slate-400">VAT Rate (%)</span>
              <Input
                type="number"
                value={config.VatRate}
                onChange={(e) => setConfig({ ...config, VatRate: parseFloat(e.target.value) })}
                className="w-20 bg-transparent border-none text-right font-black text-emerald-500 h-6 p-0"
              />
            </div>
          </Card>

          {/* BLOCK: SUBCHARGE SPECIALS */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 space-y-4 rounded-3xl border-l-4 border-l-amber-600 shadow-xl text-amber-200">
            <h3 className="text-[10px] font-black uppercase text-amber-500 flex items-center gap-2 tracking-widest">
              <Zap className="h-4 w-4" /> SubchargeAsDish
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] uppercase">Name</Label>
                <Input
                  value={config.SubchargeAsDishName}
                  onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })}
                  className="bg-slate-950 h-9 text-[11px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[8px] uppercase">Code</Label>
                  <Input
                    value={config.SubchargeAsDishCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div>
                  <Label className="text-[8px] uppercase">ADG</Label>
                  <Input
                    value={config.SubchargeAsDishAdgCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishAdgCode: e.target.value })}
                    className="bg-slate-950 h-9 text-amber-500"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <span className="text-[9px] font-bold uppercase">Use as Dish</span>
                <Switch
                  checked={config.UseSubchargeAsDish}
                  onCheckedChange={(v) => setConfig({ ...config, UseSubchargeAsDish: v })}
                />
              </div>
            </div>
          </Card>

          {/* BLOCK: AGGREGATE SALES */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 space-y-4 rounded-3xl border-l-4 border-l-purple-600 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-purple-500 flex items-center gap-2 tracking-widest">
              <Database className="h-4 w-4" /> Aggregate Sales
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] uppercase">Aggregate Name</Label>
                <Input
                  value={config.AggregateSaleName}
                  onChange={(e) => setConfig({ ...config, AggregateSaleName: e.target.value })}
                  className="bg-slate-950 h-9 text-[11px]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label className="text-[8px] uppercase">Code</Label>
                  <Input
                    value={config.AggregateSaleCode}
                    onChange={(e) => setConfig({ ...config, AggregateSaleCode: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-[8px] uppercase">ADG</Label>
                  <Input
                    value={config.AggregateSaleAdg}
                    onChange={(e) => setConfig({ ...config, AggregateSaleAdg: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-[8px] uppercase">Unit</Label>
                  <Input
                    value={config.AggregateSaleUnit}
                    onChange={(e) => setConfig({ ...config, AggregateSaleUnit: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-purple-500/5 rounded-lg border border-purple-500/10">
                <span className="text-[9px] font-bold uppercase">Enable</span>
                <Switch
                  checked={config.AggregateSales}
                  onCheckedChange={(v) => setConfig({ ...config, AggregateSales: v })}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* 3. FINAL ROW: SYSTEM SWITCHES & VERSIONING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LOGIC SWITCHES */}
          <Card className="lg:col-span-8 bg-slate-900/30 border-slate-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-6 flex items-center gap-2 tracking-[0.3em]">
              <ShieldCheck className="h-4 w-4" /> Operational Logic (XML Flags)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Discount In KKM", key: "UseDiscountInKkm" },
                { label: "Kitchen Name", key: "UseKitchenName" },
                { label: "Default ADG", key: "UseDefaultAdg" },
                { label: "Dept from Kitchen", key: "UseDepartmentFromKitchenName" },
                { label: "Disable CashIO", key: "DisableCashInOut" },
                { label: "X-Report", key: "DoXReport" },
                { label: "Z-Report", key: "DoZReport" },
                { label: "C16 Transfer", key: "C16CardIdTransfer" },
              ].map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-slate-800/60"
                >
                  <span className="text-[9px] font-black uppercase text-slate-400">{f.label}</span>
                  <Switch
                    checked={(config as any)[f.key]}
                    onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* VERSIONING & META */}
          <Card className="lg:col-span-4 bg-slate-900/30 border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-widest">
              <AlertCircle className="h-4 w-4" /> Version / Core
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[8px] uppercase">Backup Limit (Days)</Label>
                <Input
                  type="number"
                  value={config.BackupDaysLimit}
                  onChange={(e) => setConfig({ ...config, BackupDaysLimit: parseInt(e.target.value) })}
                  className="bg-slate-950 h-10 font-bold text-blue-400"
                />
              </div>
              <div>
                <Label className="text-[8px] uppercase">Relogin Counter</Label>
                <Input
                  type="number"
                  value={config.CounterToRelogin}
                  onChange={(e) => setConfig({ ...config, CounterToRelogin: parseInt(e.target.value) })}
                  className="bg-slate-950 h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <Label className="text-[8px] uppercase font-mono italic">AdgCodeLength</Label>
                <Input
                  type="number"
                  value={config.AdgCodeFromProductCodeLength}
                  onChange={(e) => setConfig({ ...config, AdgCodeFromProductCodeLength: parseInt(e.target.value) })}
                  className="bg-slate-950 h-9"
                />
              </div>
              <div>
                <Label className="text-[8px] uppercase font-mono italic">FastCodeLength</Label>
                <Input
                  type="number"
                  value={config.AdgCodeFromProductFastCodeLength}
                  onChange={(e) => setConfig({ ...config, AdgCodeFromProductFastCodeLength: parseInt(e.target.value) })}
                  className="bg-slate-950 h-9"
                />
              </div>
            </div>
            <div className="pt-2">
              <Label className="text-[8px] uppercase text-slate-500">Manual/Auto Mode</Label>
              <Input
                value={config.Mode}
                onChange={(e) => setConfig({ ...config, Mode: e.target.value })}
                className="bg-slate-950 h-9"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
