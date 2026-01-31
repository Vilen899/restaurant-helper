import { useState, useEffect } from "react";
import {
  Save,
  Cpu,
  Wifi,
  Hash,
  Zap,
  CreditCard,
  Plus,
  Trash2,
  MapPin,
  Settings,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  use_discount: boolean;
  use_subcharge_as_dish: boolean;
  use_kitchen_name: boolean;
  default_adg: string;
  use_default_adg: boolean;
  subcharge_code: string;
  subcharge_name: string;
  subcharge_adg: string;
  subcharge_unit: string;
  op_timeout: number;
  kkm_timeout: number;
  adg_length: number;
  fast_code_length: number;
  backup_days: number;
  debug_mode: number;
  disable_cash_io: boolean;
  payment_types: PaymentTypeItem[];
}

// ПОЛНЫЙ СПИСОК ИЗ ТВОЕГО XML (9 методов)
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

const initialConfig: FullConfig = {
  location_id: "",
  host: "192.168.9.19",
  port: "8080",
  cashier_id: "3",
  cashier_pin: "4321",
  kkm_password: "Aa1111Bb",
  vat_rate: 16.67,
  use_discount: true,
  use_subcharge_as_dish: true,
  use_kitchen_name: true,
  default_adg: "56.10",
  use_default_adg: true,
  subcharge_code: "999999",
  subcharge_name: "Հանрային սննդի կազմակերպում",
  subcharge_adg: "56.10",
  subcharge_unit: "հատ․",
  op_timeout: 30000,
  kkm_timeout: 120000,
  adg_length: 1,
  fast_code_length: 1,
  backup_days: 14,
  debug_mode: 1,
  disable_cash_io: true,
  payment_types: xmlDefaultPayments,
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
      const raw = data as any;
      setConfig({
        ...initialConfig,
        ...raw,
        location_id: locId,
        payment_types:
          Array.isArray(raw.payment_types) && raw.payment_types.length > 0 ? raw.payment_types : xmlDefaultPayments,
      });
    } else {
      setConfig({ ...initialConfig, location_id: locId, payment_types: xmlDefaultPayments });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() } as any, { onConflict: "location_id" });
    if (!error) toast.success("Configuration saved for " + locations.find((l) => l.id === config.location_id)?.name);
    else toast.error("Sync failed: " + error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-blue-500 animate-pulse tracking-widest">
        LOADING_XML_MANIFEST_v0.7...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-4 md:p-8 pb-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-blue-500/20 shadow-lg">
              <Cpu className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">
                KKM Driver Config <span className="text-blue-500 text-xs ml-2 tracking-widest">v0.7</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-blue-500" />
                <Select value={config.location_id} onValueChange={loadSettings}>
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto text-blue-400 font-bold focus:ring-0">
                    <SelectValue placeholder="Point Selection" />
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 px-10 rounded-xl shadow-xl shadow-blue-600/10 transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em]"
          >
            <Save className="mr-2 h-4 w-4" /> Sync To Database
          </Button>
        </div>

        {/* PAYMENT METHODS TABLE */}
        <Card className="bg-slate-900/30 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-purple-500" /> Payment Registry
            </CardTitle>
            <Button
              onClick={() =>
                setConfig({
                  ...config,
                  payment_types: [
                    ...config.payment_types,
                    { Id: "", Name: "New Method", UseExtPos: true, PaymentType: "paidAmountCard", enabled: true },
                  ],
                })
              }
              variant="outline"
              className="border-slate-700 h-8 text-[9px] font-bold rounded-lg px-4 hover:bg-slate-800 uppercase tracking-widest"
            >
              <Plus className="h-3 w-3 mr-2" /> Add Method
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-slate-500 border-b border-slate-800 uppercase text-[9px] font-black">
                <tr>
                  <th className="p-4 text-center w-20">Status</th>
                  <th className="p-4 text-left">Display Name</th>
                  <th className="p-4 text-left">iiko UUID (Mapping)</th>
                  <th className="p-4 text-left">KKM Type</th>
                  <th className="p-4 text-center w-16">Ext</th>
                  <th className="p-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {config.payment_types.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`transition-all ${!pt.enabled ? "opacity-25 grayscale" : "hover:bg-blue-900/5"}`}
                  >
                    <td className="p-4 text-center">
                      <Switch
                        checked={pt.enabled}
                        onCheckedChange={(v) => {
                          const upd = [...config.payment_types];
                          upd[idx].enabled = v;
                          setConfig({ ...config, payment_types: upd });
                        }}
                        className="data-[state=checked]:bg-green-600"
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
                        className="bg-slate-950/50 border-slate-800 h-9 text-xs font-bold text-white focus:border-blue-500"
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
                        className="bg-slate-950/50 border-slate-800 h-9 text-[10px] font-mono text-slate-400 focus:text-blue-400"
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
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 h-9 text-[10px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">CASH (0)</SelectItem>
                          <SelectItem value="paidAmountCard">CARD / ONLINE (1)</SelectItem>
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
                        className="h-8 w-8 text-slate-600 hover:text-red-500 hover:bg-red-500/10"
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

        {/* BOTTOM BLOCKS: FISCAL & TECHNICAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* HARDWARE */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-blue-400 mb-2 flex items-center gap-2 tracking-[0.2em]">
              <Wifi className="h-4 w-4" /> Endpoint Control
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Host IP</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono text-xs"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Port</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono text-xs"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Op Timeout</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10 text-xs"
                  value={config.op_timeout}
                  onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">KKM Timeout</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10 text-xs"
                  value={config.kkm_timeout}
                  onChange={(e) => setConfig({ ...config, kkm_timeout: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          {/* FISCAL RULES */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-amber-500 mb-2 flex items-center gap-2 tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4" /> Fiscal Rules
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">VAT Rate %</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 font-mono text-amber-500"
                  value={config.vat_rate}
                  onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Cashier ID</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.cashier_id}
                  onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1 pt-2">
              <Label className="text-[9px] uppercase text-slate-500">Fiscal Subcharge Name</Label>
              <Input
                className="bg-slate-950 border-slate-800 h-10 text-xs text-amber-200"
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
          </Card>

          {/* SYSTEM LOGIC */}
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-purple-400 mb-2 flex items-center gap-2 tracking-[0.2em]">
              <Activity className="h-4 w-4" /> System Core
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">ADG Length</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
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
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-slate-800">
                <Label className="text-[8px] uppercase text-slate-500">Cash IO</Label>
                <Switch
                  checked={!config.disable_cash_io}
                  onCheckedChange={(v) => setConfig({ ...config, disable_cash_io: !v })}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-slate-800">
                <Label className="text-[8px] uppercase text-slate-500">Kitchen Name</Label>
                <Switch
                  checked={config.use_kitchen_name}
                  onCheckedChange={(v) => setConfig({ ...config, use_kitchen_name: v })}
                  size="sm"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
