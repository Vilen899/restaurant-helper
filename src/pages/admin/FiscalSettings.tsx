import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, Plus, Trash2, MapPin, Settings, ShieldCheck } from "lucide-react";
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
    Id: "3859f307-61e4-4bcd-9314-757f831d8c23",
    Name: "Idram",
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
  subcharge_name: "Հանրային սննդի կազմակերպում",
  subcharge_adg: "56.10",
  subcharge_unit: "հատ․",
  op_timeout: 30000,
  kkm_timeout: 120000,
  adg_length: 1,
  fast_code_length: 1,
  payment_types: originalXmlPayments,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullConfig>(initialConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getLocations() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data?.length) {
        setLocations(data);
        loadSettings(data[0].id);
      }
    }
    getLocations();
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
        payment_types: Array.isArray(raw.payment_types) ? raw.payment_types : originalXmlPayments,
      });
    } else {
      setConfig({ ...initialConfig, location_id: locId });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() } as any, { onConflict: "location_id" });
    if (!error) toast.success("Settings strictly synced");
    else toast.error("Error: " + error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono">
        LOADING_FULL_MANIFEST...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-xl">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">HDM Armenia Full Config</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-blue-500" />
                <Select value={config.location_id} onValueChange={loadSettings}>
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto text-blue-400 font-bold focus:ring-0">
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 px-10 rounded-xl shadow-lg shadow-blue-600/20 uppercase text-xs tracking-widest"
          >
            <Save className="mr-2 h-4 w-4" /> SYNC POINT DATA
          </Button>
        </div>

        {/* PAYMENT REGISTRY */}
        <Card className="bg-slate-900/30 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-6 flex flex-row justify-between items-center">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-purple-500" /> Payment Methods (iiko -{">"} KKM)
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
              className="border-slate-700 h-8 text-[10px] font-bold rounded-lg px-4 hover:bg-slate-800"
            >
              <Plus className="h-3 w-3 mr-2" /> ADD NEW
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/50 text-slate-500 border-b border-slate-800 uppercase text-[9px] font-black">
                <tr>
                  <th className="p-4 text-center w-20">Active</th>
                  <th className="p-4 text-left">Method Name</th>
                  <th className="p-4 text-left">iiko UUID</th>
                  <th className="p-4 text-left">Protocol Type</th>
                  <th className="p-4 text-center w-20">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {config.payment_types.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`transition-all ${!pt.enabled ? "opacity-30 grayscale bg-red-900/5" : "hover:bg-blue-900/5"}`}
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
                        className="bg-slate-950 border-slate-800 h-9 text-xs font-bold text-white"
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
                        className="bg-slate-950 border-slate-800 h-9 text-[10px] font-mono text-slate-400"
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
                        <SelectTrigger className="bg-slate-950 border-slate-800 h-9 text-[10px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">CASH</SelectItem>
                          <SelectItem value="paidAmountCard">CARD / EXTERNAL</SelectItem>
                        </SelectContent>
                      </Select>
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

        {/* SUBCHARGE & ADG SECTION (ОДИН В ОДИН ИЗ XML) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-amber-500 mb-6 flex items-center gap-2 tracking-[0.2em]">
              <Zap className="h-4 w-4" /> Subcharge & ADG Logic
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Subcharge Code</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10 font-mono text-amber-200"
                    value={config.subcharge_code}
                    onChange={(e) => setConfig({ ...config, subcharge_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Subcharge Unit</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.subcharge_unit}
                    onChange={(e) => setConfig({ ...config, subcharge_unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-slate-500">Subcharge Name (Fiscal)</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10 text-xs"
                  value={config.subcharge_name}
                  onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
                />
              </div>
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
                  <Label className="text-[9px] uppercase text-slate-500">Fast Code Length</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.fast_code_length}
                    onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-blue-500 mb-6 flex items-center gap-2 tracking-[0.2em]">
              <Settings className="h-4 w-4" /> Driver & Hardware Settings
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Host IP</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10 font-mono"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Port</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10 font-mono"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Op Timeout (ms)</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.op_timeout}
                    onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">KKM Timeout (ms)</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.kkm_timeout}
                    onChange={(e) => setConfig({ ...config, kkm_timeout: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">Cashier ID</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.cashier_id}
                    onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">VAT Rate %</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.vat_rate}
                    onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-slate-500">KKM Pass</Label>
                  <Input
                    type="password"
                    className="bg-slate-950 border-slate-800 h-10"
                    value={config.kkm_password}
                    onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* SYSTEM FLAGS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Use Discount", key: "use_discount" },
            { label: "Kitchen Name", key: "use_kitchen_name" },
            { label: "Default ADG", key: "use_default_adg" },
            { label: "Subcharge Dish", key: "use_subcharge_as_dish" },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl"
            >
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</Label>
              <Switch
                checked={(config as any)[item.key]}
                onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
