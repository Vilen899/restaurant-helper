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
  Lock,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 1. ПОЛНЫЙ ПЕРЕНОС МЕТОДОВ ОПЛАТЫ (STRICT XML DATA)
const XML_PAYMENT_METHODS = [
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

// 2. ПОЛНЫЙ ПЕРЕНОС ПАРАМЕТРОВ ИЗ XML (STRICT CONSTANTS)
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
  // Твои аргументы Aggregate Sales
  AggregateSales: false,
  AggregateSaleName: "Հանրային սնունդ",
  AggregateSaleAdg: "56.10",
  AggregateSaleCode: "1",
  AggregateSaleUnit: "հատ",
  // Твои аргументы SubchargeAsDish
  SubchargeAsDishCode: "999999",
  SubchargeAsDishName: "Հանրային սննդի կազմակերպում",
  SubchargeAsDishAdgCode: "56.10",
  SubchargeAsDishUnit: "հատ․",
  // Тайминги и лимиты
  DefaultOperationTimeout: 30000,
  KkmPaymentTimeout: 120000,
  AdgCodeFromProductCodeLength: 1,
  AdgCodeFromProductFastCodeLength: 1,
  BackupDaysLimit: 14,
  VersionMajor: 0,
  VersionMinor: 7,
  DisableCashInOut: true,
  DoXReport: false,
  DoZReport: false,
  CounterToRelogin: 50,
  DebugMode: 1,
  Mode: "Manual",
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState({ ...XML_DEFAULTS, location_id: "", PaymentTypes: XML_PAYMENT_METHODS });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();

    // Если в базе есть данные - объединяем с XML (XML в приоритете для пустых полей)
    if (data) {
      setConfig({
        ...XML_DEFAULTS,
        ...data,
        location_id: locId,
        PaymentTypes: data.PaymentTypes && data.PaymentTypes.length > 0 ? data.PaymentTypes : XML_PAYMENT_METHODS,
      });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId, PaymentTypes: XML_PAYMENT_METHODS });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id" },
    );

    if (!error) toast.success("XML МАНУФЕСТ ПРИМЕНЕН");
    else toast.error(error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-blue-500">
        SYNCING_WITH_XML_SOURCE...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* TOP CONTROL BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tighter uppercase italic">HDM XML Controller</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-400">
                <MapPin className="h-3 w-3" />
                <select
                  className="bg-transparent border-none outline-none"
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 h-12 rounded-xl text-[11px] tracking-widest transition-all shadow-lg shadow-blue-900/20"
          >
            <Save className="mr-2 h-4 w-4" /> SAVE XML TO DATABASE
          </Button>
        </div>

        {/* 1. PAYMENT METHODS - LOADED FROM XML */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Registry (Fixed XML)
            </span>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-black/60 text-slate-500 font-bold uppercase text-[9px]">
              <tr>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-left">Internal Name</th>
                <th className="p-4 text-left">XML UUID (Fixed)</th>
                <th className="p-4 text-left">Fiscal Type</th>
                <th className="p-4 text-center">External POS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {config.PaymentTypes.map((pt, idx) => (
                <tr key={idx} className="hover:bg-blue-900/5 transition-colors">
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
                  <td className="p-4 font-bold text-white italic">{pt.Name}</td>
                  <td className="p-4 font-mono text-slate-500 text-[10px]">{pt.Id}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-950 text-blue-400 rounded-md font-bold">{pt.PaymentType}</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* 2. AGGREGATE & SUBCHARGE - FROM XML */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl shadow-xl border-l-4 border-l-purple-600">
            <div className="flex items-center gap-2 mb-6">
              <Database className="h-5 w-5 text-purple-500" />
              <h3 className="text-xs font-black uppercase text-white tracking-widest">Aggregate Sales (XML)</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Name</Label>
                  <Input
                    value={config.AggregateSaleName}
                    onChange={(e) => setConfig({ ...config, AggregateSaleName: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">ADG Code</Label>
                  <Input
                    value={config.AggregateSaleAdg}
                    onChange={(e) => setConfig({ ...config, AggregateSaleAdg: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10 text-purple-400 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Code</Label>
                  <Input
                    value={config.AggregateSaleCode}
                    onChange={(e) => setConfig({ ...config, AggregateSaleCode: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Unit</Label>
                  <Input
                    value={config.AggregateSaleUnit}
                    onChange={(e) => setConfig({ ...config, AggregateSaleUnit: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center bg-purple-950/20 p-3 rounded-xl border border-purple-900/30 mt-4">
                <span className="text-[10px] font-black text-purple-300 uppercase">Enable Aggregate Mode</span>
                <Switch
                  checked={config.AggregateSales}
                  onCheckedChange={(v) => setConfig({ ...config, AggregateSales: v })}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl shadow-xl border-l-4 border-l-amber-600">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase text-white tracking-widest">Subcharge As Dish (XML)</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] text-slate-500 uppercase">Dish Name</Label>
                <Input
                  value={config.SubchargeAsDishName}
                  onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })}
                  className="bg-slate-950 border-slate-800 h-10 font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">ADG</Label>
                  <Input
                    value={config.SubchargeAsDishAdgCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishAdgCode: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10 text-amber-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Code</Label>
                  <Input
                    value={config.SubchargeAsDishCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Unit</Label>
                  <Input
                    value={config.SubchargeAsDishUnit}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishUnit: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-10"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. HARDWARE & LOGIC - FROM XML */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <h4 className="text-[10px] font-black text-blue-500 uppercase mb-4 flex items-center gap-2">
              <Wifi className="h-4 w-4" /> TCP Connection
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-600">HOST</Label>
                <Input
                  value={config.Host}
                  onChange={(e) => setConfig({ ...config, Host: e.target.value })}
                  className="h-9 bg-slate-950 text-blue-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-600">PORT</Label>
                <Input
                  value={config.Port}
                  onChange={(e) => setConfig({ ...config, Port: e.target.value })}
                  className="h-9 bg-slate-950 text-blue-400 font-mono"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4" /> KKM Security
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-600">CASHIER ID</Label>
                <Input
                  value={config.CashierId}
                  onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
                  className="h-9 bg-slate-950"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] text-slate-600">PIN</Label>
                <Input
                  value={config.CashierPin}
                  onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
                  className="h-9 bg-slate-950"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Operational Flags
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-slate-800">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Discount</span>
                <Switch
                  checked={config.UseDiscountInKkm}
                  onCheckedChange={(v) => setConfig({ ...config, UseDiscountInKkm: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-slate-800">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Z-Report</span>
                <Switch checked={config.DoZReport} onCheckedChange={(v) => setConfig({ ...config, DoZReport: v })} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
