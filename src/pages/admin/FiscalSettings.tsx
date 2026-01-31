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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 1. Полная структура данных из твоего XML
interface PaymentTypeItem {
  Id: string;
  Name: string;
  UseExtPos: boolean;
  PaymentType: "paidAmount" | "paidAmountCard";
  enabled: boolean;
}

interface FullConfig {
  location_id: string;
  host: string;
  port: string;
  cashier_id: string;
  cashier_pin: string;
  kkm_password: string;
  vat_rate: number;
  use_discount_in_kkm: boolean;
  use_subcharge_as_dish: boolean;
  use_kitchen_name: boolean;
  default_adg: string;
  use_default_adg: boolean;
  use_dept_from_kitchen: boolean;
  bonus_payment_name: string;
  c16_transfer: boolean;
  subcharge_code: string;
  subcharge_name: string;
  subcharge_adg: string;
  subcharge_unit: string;
  op_timeout: number;
  kkm_timeout: number;
  adg_length: number;
  fast_code_length: number;
  backup_days: number;
  version_major: number;
  version_minor: number;
  aggregate_sales: boolean;
  aggregate_name: string;
  aggregate_adg: string;
  aggregate_code: string;
  aggregate_unit: string;
  disable_cash_io: boolean;
  do_x_report: boolean;
  do_z_report: boolean;
  counter_relogin: number;
  debug_mode: number;
  manual_mode: string;
  payment_types: PaymentTypeItem[];
}

const originalXmlPayments: PaymentTypeItem[] = [
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

const initialConfig: FullConfig = {
  location_id: "",
  host: "192.168.9.19",
  port: "8080",
  cashier_id: "3",
  cashier_pin: "4321",
  kkm_password: "Aa1111Bb",
  vat_rate: 16.67,
  use_discount_in_kkm: true,
  use_subcharge_as_dish: true,
  use_kitchen_name: true,
  default_adg: "56.10",
  use_default_adg: true,
  use_dept_from_kitchen: false,
  bonus_payment_name: "",
  c16_transfer: false,
  subcharge_code: "999999",
  subcharge_name: "Հանրային սննդի կազմակերպում",
  subcharge_adg: "56.10",
  subcharge_unit: "հատ․",
  op_timeout: 30000,
  kkm_timeout: 120000,
  adg_length: 1,
  fast_code_length: 1,
  backup_days: 14,
  version_major: 0,
  version_minor: 7,
  aggregate_sales: false,
  aggregate_name: "",
  aggregate_adg: "",
  aggregate_code: "",
  aggregate_unit: "",
  disable_cash_io: true,
  do_x_report: false,
  do_z_report: false,
  counter_relogin: 50,
  debug_mode: 1,
  manual_mode: "Manual",
  payment_types: originalXmlPayments,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullConfig>(initialConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data?.length) {
        setLocations(data);
        loadSettings(data[0].id);
      }
    }
    init();
  }, []);

  async function loadSettings(locId: string) {
    setLoading(true);
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
    if (data) {
      setConfig({ ...initialConfig, ...(data as any), location_id: locId });
    } else {
      setConfig({ ...initialConfig, location_id: locId });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() } as any, { onConflict: "location_id" });
    if (!error) toast.success("ALL PARAMETERS SYNCED");
    else toast.error(error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-blue-500">
        INIT_FULL_XML_DUMP...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-4 md:p-8 pb-32 font-sans tracking-tight">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-blue-500/20 shadow-lg">
              <Cpu className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                HDM MASTER CONFIG v{config.version_major}.{config.version_minor}
              </h1>
              <div className="flex items-center gap-3 mt-1 font-bold text-blue-500">
                <MapPin className="h-4 w-4" />
                <Select value={config.location_id} onValueChange={loadSettings}>
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto text-blue-400 focus:ring-0 uppercase text-xs">
                    <SelectValue />
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 h-14 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
          >
            <Save className="mr-3 h-5 w-5" /> Save Full XML State
          </Button>
        </div>

        {/* 1. PAYMENT TYPES (THE CORE) */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="bg-slate-900/40 border-b border-slate-800 p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-purple-500" /> Payment Registry Mapping
            </CardTitle>
            <Button
              onClick={() =>
                setConfig({
                  ...config,
                  payment_types: [
                    ...config.payment_types,
                    { Id: "", Name: "New", UseExtPos: true, PaymentType: "paidAmountCard", enabled: true },
                  ],
                })
              }
              variant="outline"
              className="border-slate-700 h-9 text-[10px] font-bold px-4 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-2" /> ADD ITEM
            </Button>
          </CardHeader>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-slate-500 uppercase text-[9px] font-black">
                <tr>
                  <th className="p-4 text-center w-24">Active</th>
                  <th className="p-4 text-left">Method Name</th>
                  <th className="p-4 text-left">iiko External ID (UUID)</th>
                  <th className="p-4 text-left">Fiscal Type</th>
                  <th className="p-4 text-center w-20">ExtPos</th>
                  <th className="p-4 text-center w-16">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {config.payment_types.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`transition-all ${!pt.enabled ? "opacity-20 grayscale" : "hover:bg-blue-900/5"}`}
                  >
                    <td className="p-4 text-center">
                      <Switch
                        checked={pt.enabled}
                        onCheckedChange={(v) => {
                          const upd = [...config.payment_types];
                          upd[idx].enabled = v;
                          setConfig({ ...config, payment_types: upd });
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        value={pt.Name}
                        onChange={(e) => {
                          const upd = [...config.payment_types];
                          upd[idx].Name = e.target.value;
                          setConfig({ ...config, payment_types: upd });
                        }}
                        className="bg-slate-950 border-slate-800 h-10 text-xs font-bold text-white"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        value={pt.Id}
                        onChange={(e) => {
                          const upd = [...config.payment_types];
                          upd[idx].Id = e.target.value;
                          setConfig({ ...config, payment_types: upd });
                        }}
                        className="bg-slate-950 border-slate-800 h-10 text-[10px] font-mono text-slate-400"
                      />
                    </td>
                    <td className="p-4">
                      <Select
                        value={pt.PaymentType}
                        onValueChange={(v: any) => {
                          const upd = [...config.payment_types];
                          upd[idx].PaymentType = v;
                          setConfig({ ...config, payment_types: upd });
                        }}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 h-10 text-[10px] uppercase font-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">CASH (0)</SelectItem>
                          <SelectItem value="paidAmountCard">CARD (1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={pt.UseExtPos}
                        onCheckedChange={(v) => {
                          const upd = [...config.payment_types];
                          upd[idx].UseExtPos = v;
                          setConfig({ ...config, payment_types: upd });
                        }}
                      />
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setConfig({ ...config, payment_types: config.payment_types.filter((_, i) => i !== idx) })
                        }
                        className="h-8 w-8 text-slate-600 hover:text-red-500"
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

        {/* 2. CORE SYSTEM SETTINGS (TECHNICAL) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* HARDWARE & CONNECTION */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Hardware Connection
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Host</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Port</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">OP Timeout</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.op_timeout}
                  onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">KKM Timeout</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.kkm_timeout}
                  onChange={(e) => setConfig({ ...config, kkm_timeout: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Relogin Ctr</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.counter_relogin}
                  onChange={(e) => setConfig({ ...config, counter_relogin: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Debug Mode</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.debug_mode}
                  onChange={(e) => setConfig({ ...config, debug_mode: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          {/* SUBCHARGE AS DISH (SPECIAL LOGIC) */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-amber-500 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Subcharge As Dish
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Code</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono text-amber-500"
                  value={config.subcharge_code}
                  onChange={(e) => setConfig({ ...config, subcharge_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Unit</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.subcharge_unit}
                  onChange={(e) => setConfig({ ...config, subcharge_unit: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase text-slate-500 text-xs">Fiscal Name</Label>
              <Input
                className="bg-slate-950 border-slate-800 h-10 text-xs"
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">ADG Code</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.subcharge_adg}
                  onChange={(e) => setConfig({ ...config, subcharge_adg: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">ADG Length</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          {/* AGGREGATE SALES SETTINGS */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase text-purple-500 flex items-center gap-2">
                <Database className="h-4 w-4" /> Aggregate Sales
              </h3>
              <Switch
                checked={config.aggregate_sales}
                onCheckedChange={(v) => setConfig({ ...config, aggregate_sales: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 opacity-70">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Code</Label>
                <Input
                  disabled={!config.aggregate_sales}
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.aggregate_code}
                  onChange={(e) => setConfig({ ...config, aggregate_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase">Unit</Label>
                <Input
                  disabled={!config.aggregate_sales}
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.aggregate_unit}
                  onChange={(e) => setConfig({ ...config, aggregate_unit: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase text-slate-500">Aggregate Name</Label>
              <Input
                disabled={!config.aggregate_sales}
                className="bg-slate-950 border-slate-800 h-10 text-xs"
                value={config.aggregate_name}
                onChange={(e) => setConfig({ ...config, aggregate_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase text-slate-500">Aggregate ADG</Label>
              <Input
                disabled={!config.aggregate_sales}
                className="bg-slate-950 border-slate-800 h-10"
                value={config.aggregate_adg}
                onChange={(e) => setConfig({ ...config, aggregate_adg: e.target.value })}
              />
            </div>
          </Card>
        </div>

        {/* 3. FLAGS AND BOOLEAN LOGIC */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-6">
            <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
              <Terminal className="h-3 w-3" /> Operation Flags
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs">Z-Report</span>
                <Switch
                  checked={config.do_z_report}
                  onCheckedChange={(v) => setConfig({ ...config, do_z_report: v })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">X-Report</span>
                <Switch
                  checked={config.do_x_report}
                  onCheckedChange={(v) => setConfig({ ...config, do_x_report: v })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">C16 Transfer</span>
                <Switch
                  checked={config.c16_transfer}
                  onCheckedChange={(v) => setConfig({ ...config, c16_transfer: v })}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-6">
            <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> Fiscal Logic
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs">Use Discount</span>
                <Switch
                  checked={config.use_discount_in_kkm}
                  onCheckedChange={(v) => setConfig({ ...config, use_discount_in_kkm: v })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Kitchen Name</span>
                <Switch
                  checked={config.use_kitchen_name}
                  onCheckedChange={(v) => setConfig({ ...config, use_kitchen_name: v })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Dept from Kitchen</span>
                <Switch
                  checked={config.use_dept_from_kitchen}
                  onCheckedChange={(v) => setConfig({ ...config, use_dept_from_kitchen: v })}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-6">
            <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
              <FileText className="h-3 w-3" /> Credentials
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[8px] uppercase">Cashier Pin</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-8"
                  value={config.cashier_pin}
                  onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] uppercase">KKM Password</Label>
                <Input
                  type="password"
                  className="bg-slate-950 border-slate-800 h-8 text-blue-500"
                  value={config.kkm_password}
                  onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 space-y-6">
            <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Version & Modes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[8px] uppercase">Major</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-8"
                  value={config.version_major}
                  onChange={(e) => setConfig({ ...config, version_major: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[8px] uppercase">Minor</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-8"
                  value={config.version_minor}
                  onChange={(e) => setConfig({ ...config, version_minor: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] uppercase text-slate-500">Backup Days</Label>
              <Input
                type="number"
                className="bg-slate-950 border-slate-800 h-8"
                value={config.backup_days}
                onChange={(e) => setConfig({ ...config, backup_days: parseInt(e.target.value) })}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
