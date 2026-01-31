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

// --- ПОЛНЫЙ ПЕРЕНОС МЕТОДОВ ОПЛАТЫ ИЗ ТВОЕГО XML ---
const xmlDefaultPayments = [
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

// --- АВТОМАТИЧЕСКОЕ ЗАПОЛНЕНИЕ ВСЕХ ПАРАМЕТРОВ ИЗ XML ---
const initialConfig = {
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
  SubchargeAsDishName: "Հանрային սննդի կազմակերպում",
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
  const [config, setConfig] = useState(initialConfig);
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
      const dbData = data;
      const validatedPayments = Array.isArray(dbData.PaymentTypes)
        ? dbData.PaymentTypes
        : Array.isArray(dbData.payment_types)
          ? dbData.payment_types
          : xmlDefaultPayments;
      setConfig({ ...initialConfig, ...dbData, location_id: locId, PaymentTypes: validatedPayments });
    } else {
      setConfig({ ...initialConfig, location_id: locId });
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
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-emerald-500 italic">
        AUTO_INJECTING_XML_DATA...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 pb-32 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
              <Terminal className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic">HDM XML Auto-Config</h1>
              <div className="text-blue-400 text-[10px] font-bold tracking-widest uppercase">
                Location:
                <select
                  className="bg-transparent ml-2 outline-none cursor-pointer"
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 h-12 rounded-xl uppercase text-[10px] tracking-widest shadow-blue-500/20 shadow-xl transition-all"
          >
            <Save className="mr-2 h-4 w-4" /> Overwrite to DB
          </Button>
        </div>

        {/* ПЛАТЕЖИ - УЖЕ ЗАПОЛНЕНЫ */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Methods Registry (From XML)
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-black/60 text-slate-500 uppercase font-black text-[9px]">
              <tr>
                <th className="p-3 text-center">Active</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Internal ID (UUID)</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-center">ExtPos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {config.PaymentTypes.map((pt, idx) => (
                <tr key={idx} className="hover:bg-blue-900/5 transition-colors">
                  <td className="p-3 text-center">
                    <Switch
                      checked={pt.enabled}
                      onCheckedChange={(v) => {
                        const upd = [...config.PaymentTypes];
                        upd[idx].enabled = v;
                        setConfig({ ...config, PaymentTypes: upd });
                      }}
                    />
                  </td>
                  <td className="p-3 font-bold text-white uppercase">{pt.Name}</td>
                  <td className="p-3 font-mono text-slate-500">{pt.Id}</td>
                  <td className="p-3 text-blue-400 font-bold">{pt.PaymentType}</td>
                  <td className="p-3 text-center">
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

        {/* ВСЕ ОСТАЛЬНЫЕ ПОЛЯ - ТОЖЕ ЗАПОЛНЕНЫ */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl border-t-2 border-t-blue-500">
            <h3 className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Wifi className="h-3 w-3" /> Connection
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">Host IP</Label>
                <Input
                  value={config.Host}
                  onChange={(e) => setConfig({ ...config, Host: e.target.value })}
                  className="bg-slate-950 h-8 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">Port</Label>
                <Input
                  value={config.Port}
                  onChange={(e) => setConfig({ ...config, Port: e.target.value })}
                  className="bg-slate-950 h-8 font-mono text-xs"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl border-t-2 border-t-emerald-500">
            <h3 className="text-[10px] font-black text-emerald-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Lock className="h-3 w-3" /> Auth
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[8px] text-slate-500 uppercase">ID</Label>
                  <Input
                    value={config.CashierId}
                    onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
                    className="bg-slate-950 h-8"
                  />
                </div>
                <div>
                  <Label className="text-[8px] text-slate-500 uppercase">PIN</Label>
                  <Input
                    value={config.CashierPin}
                    onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
                    className="bg-slate-950 h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">KKM Password</Label>
                <Input
                  value={config.KkmPassword}
                  onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })}
                  className="bg-slate-950 h-8 text-emerald-400 font-bold"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl border-t-2 border-t-amber-500">
            <h3 className="text-[10px] font-black text-amber-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Zap className="h-3 w-3" /> Subcharge
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">ADG Code</Label>
                <Input
                  value={config.SubchargeAsDishAdgCode}
                  onChange={(e) => setConfig({ ...config, SubchargeAsDishAdgCode: e.target.value })}
                  className="bg-slate-950 h-8 text-amber-500 font-bold"
                />
              </div>
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">Dish Name</Label>
                <Input
                  value={config.SubchargeAsDishName}
                  onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })}
                  className="bg-slate-950 h-8 text-[10px]"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-2xl border-t-2 border-t-purple-500">
            <h3 className="text-[10px] font-black text-purple-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Database className="h-3 w-3" /> Aggregate
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-slate-800">
                <span className="text-[9px] font-black uppercase">Enable</span>
                <Switch
                  checked={config.AggregateSales}
                  onCheckedChange={(v) => setConfig({ ...config, AggregateSales: v })}
                />
              </div>
              <div>
                <Label className="text-[8px] text-slate-500 uppercase">Sale Name</Label>
                <Input
                  value={config.AggregateSaleName}
                  onChange={(e) => setConfig({ ...config, AggregateSaleName: e.target.value })}
                  className="bg-slate-950 h-8"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* КНОПКИ ПЕРЕКЛЮЧАТЕЛИ - ТОЖЕ ИЗ XML */}
        <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Discount", key: "UseDiscountInKkm" },
              { label: "Kitchen Name", key: "UseKitchenName" },
              { label: "Default ADG", key: "UseDefaultAdg" },
              { label: "Cash I/O", key: "DisableCashInOut" },
              { label: "X-Report", key: "DoXReport" },
              { label: "Z-Report", key: "DoZReport" },
            ].map((f) => (
              <div
                key={f.key}
                className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-slate-800/50 items-center"
              >
                <span className="text-[8px] font-black text-slate-500 uppercase">{f.label}</span>
                <Switch checked={config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
