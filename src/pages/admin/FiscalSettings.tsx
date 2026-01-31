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
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 1. МЕТОДЫ ОПЛАТЫ ИЗ ТВОЕГО XML (БЕЗ ИЗМЕНЕНИЙ)
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

// 2. ВСЕ ПАРАМЕТРЫ ИЗ XML (ПОЛНЫЙ СПИСОК)
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
  BonusPaymentName: "", // Твой аргумент
  C16CardIdTransfer: false, // Твой аргумент
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
  AggregateSaleName: "Հանրային սնունդ",
  AggregateSaleAdg: "56.10",
  AggregateSaleCode: "1",
  AggregateSaleUnit: "հատ",
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
    if (data) {
      setConfig({
        ...XML_DEFAULTS,
        ...data,
        location_id: locId,
        PaymentTypes: data.PaymentTypes || XML_PAYMENT_METHODS,
      });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId, PaymentTypes: XML_PAYMENT_METHODS });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: "location_id" });
    if (!error) toast.success("XML CONFIG SYNCED");
    else toast.error(error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-emerald-500 italic uppercase tracking-widest">
        Applying_XML_Manifest...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-[1500px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-xl">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic">
                Fiscal Core v{config.VersionMajor}.{config.VersionMinor}
              </h1>
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <select
                  className="bg-transparent outline-none"
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 h-12 rounded-xl text-[11px] tracking-widest transition-all"
          >
            OVERWRITE XML TO DB
          </Button>
        </div>

        {/* 1. ПЛАТЕЖИ */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800 text-[10px] font-black uppercase text-emerald-500">
            Payment Registry (Fixed from XML)
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-black/60 text-slate-500 font-bold uppercase text-[9px]">
              <tr>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-left">Internal Name</th>
                <th className="p-4 text-left">XML UUID</th>
                <th className="p-4 text-left">Fiscal Type</th>
                <th className="p-4 text-center">ExtPos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {config.PaymentTypes.map((pt, idx) => (
                <tr key={idx} className="hover:bg-emerald-900/5 transition-colors">
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
                  <td className="p-4 text-blue-400 font-bold uppercase">{pt.PaymentType}</td>
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

        {/* 2. ТВОИ АРГУМЕНТЫ (AGGREGATE, SUBCHARGE, BONUS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AGGREGATE */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-l-4 border-l-purple-600">
            <h3 className="text-[10px] font-black uppercase text-purple-400 mb-4 flex items-center gap-2">
              <Database className="h-4 w-4" /> Aggregate Sales
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Name</Label>
                  <Input
                    value={config.AggregateSaleName}
                    onChange={(e) => setConfig({ ...config, AggregateSaleName: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">ADG</Label>
                  <Input
                    value={config.AggregateSaleAdg}
                    onChange={(e) => setConfig({ ...config, AggregateSaleAdg: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-9 text-purple-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Code</Label>
                  <Input
                    value={config.AggregateSaleCode}
                    onChange={(e) => setConfig({ ...config, AggregateSaleCode: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Unit</Label>
                  <Input
                    value={config.AggregateSaleUnit}
                    onChange={(e) => setConfig({ ...config, AggregateSaleUnit: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-9"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-purple-950/20 rounded-lg">
                <span className="text-[9px] font-black uppercase">Enable</span>
                <Switch
                  checked={config.AggregateSales}
                  onCheckedChange={(v) => setConfig({ ...config, AggregateSales: v })}
                />
              </div>
            </div>
          </Card>

          {/* SUBCHARGE */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-l-4 border-l-amber-600">
            <h3 className="text-[10px] font-black uppercase text-amber-400 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Subcharge / Service
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Dish Name</Label>
                <Input
                  value={config.SubchargeAsDishName}
                  onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })}
                  className="bg-slate-950 border-slate-800 h-9"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[8px] uppercase">ADG</Label>
                  <Input
                    value={config.SubchargeAsDishAdgCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishAdgCode: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[8px] uppercase">Code</Label>
                  <Input
                    value={config.SubchargeAsDishCode}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[8px] uppercase">Unit</Label>
                  <Input
                    value={config.SubchargeAsDishUnit}
                    onChange={(e) => setConfig({ ...config, SubchargeAsDishUnit: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-amber-950/20 rounded-lg">
                <span className="text-[9px] font-black uppercase">Use as Dish</span>
                <Switch
                  checked={config.UseSubchargeAsDish}
                  onCheckedChange={(v) => setConfig({ ...config, UseSubchargeAsDish: v })}
                />
              </div>
            </div>
          </Card>

          {/* BONUS & C16 (ТО ЧТО ТЫ СПРАШИВАЛ) */}
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-l-4 border-l-blue-600">
            <h3 className="text-[10px] font-black uppercase text-blue-400 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Bonus & Card IDs
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">BonusPaymentName</Label>
                <Input
                  value={config.BonusPaymentName}
                  onChange={(e) => setConfig({ ...config, BonusPaymentName: e.target.value })}
                  placeholder="Пусто"
                  className="bg-slate-950 border-slate-800 h-9"
                />
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-950/20 rounded-lg border border-blue-900/30">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase">C16CardIdTransfer</span>
                  <span className="text-[7px] text-slate-500 uppercase italic">Transfer card ID to fiscal</span>
                </div>
                <Switch
                  checked={config.C16CardIdTransfer}
                  onCheckedChange={(v) => setConfig({ ...config, C16CardIdTransfer: v })}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* 3. КОННЕКТ И ТАЙМАУТЫ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <Label className="text-[8px] font-black uppercase text-slate-500">Operation Timeout (ms)</Label>
            <Input
              type="number"
              value={config.DefaultOperationTimeout}
              onChange={(e) => setConfig({ ...config, DefaultOperationTimeout: parseInt(e.target.value) })}
              className="bg-slate-950 h-9 font-mono mt-1"
            />
          </Card>
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <Label className="text-[8px] font-black uppercase text-slate-500">KKM Payment Timeout</Label>
            <Input
              type="number"
              value={config.KkmPaymentTimeout}
              onChange={(e) => setConfig({ ...config, KkmPaymentTimeout: parseInt(e.target.value) })}
              className="bg-slate-950 h-9 font-mono mt-1"
            />
          </Card>
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <Label className="text-[8px] font-black uppercase text-slate-500">Backup Days Limit</Label>
            <Input
              type="number"
              value={config.BackupDaysLimit}
              onChange={(e) => setConfig({ ...config, BackupDaysLimit: parseInt(e.target.value) })}
              className="bg-slate-950 h-9 font-mono mt-1"
            />
          </Card>
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl">
            <Label className="text-[8px] font-black uppercase text-slate-500">Relogin Counter</Label>
            <Input
              type="number"
              value={config.CounterToRelogin}
              onChange={(e) => setConfig({ ...config, CounterToRelogin: parseInt(e.target.value) })}
              className="bg-slate-950 h-9 font-mono mt-1"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
