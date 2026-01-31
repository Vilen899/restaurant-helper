import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, Plus, Trash2, Settings2, Clock, MapPin } from "lucide-react";
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
  payment_types: [],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullConfig>(initialConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getLocations() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data && data.length > 0) {
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
        payment_types: Array.isArray(raw.payment_types) ? raw.payment_types : [],
      });
    } else {
      setConfig({ ...initialConfig, location_id: locId });
    }
    setLoading(false);
  }

  const updatePaymentMethod = (index: number, fields: Partial<PaymentTypeItem>) => {
    const updated = [...config.payment_types];
    updated[index] = { ...updated[index], ...fields };
    setConfig({ ...config, payment_types: updated });
  };

  const addPaymentMethod = () => {
    const newMethod: PaymentTypeItem = {
      Id: "",
      Name: "New Method",
      UseExtPos: true,
      PaymentType: "paidAmountCard",
      enabled: true,
    };
    setConfig({ ...config, payment_types: [...config.payment_types, newMethod] });
  };

  const save = async () => {
    if (!config.location_id) return toast.error("Выберите локацию");
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "location_id" },
    );

    if (!error) toast.success("Конфигурация точки успешно синхронизирована");
    else toast.error("Ошибка сохранения: " + error.message);
  };

  if (loading && locations.length > 0)
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-blue-500 font-mono tracking-[0.3em] animate-pulse">
        LOADING_SYSTEM_CORE...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-300 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER & LOCATION SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-500/20">
              <Cpu className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                HDM CONTROL <span className="text-blue-500 text-sm ml-2 tracking-widest font-bold">ARMENIA</span>
              </h1>
              <div className="flex items-center gap-3">
                <MapPin className="h-3 w-3 text-slate-500" />
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-black h-14 px-12 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            <Save className="mr-2 h-5 w-5" /> SYNC ALL PARAMETERS
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* NETWORK & TIMEOUTS */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-800/20 border-b border-slate-800/50 py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-blue-400">
                <Wifi className="h-4 w-4" /> Network & Timeouts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Host IP</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-white font-mono h-11"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Port</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-white font-mono h-11"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold text-[9px]">Op Timeout</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 text-blue-400 h-11"
                    value={config.op_timeout}
                    onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold text-[9px]">KKM Timeout</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 text-blue-400 h-11"
                    value={config.kkm_timeout}
                    onChange={(e) => setConfig({ ...config, kkm_timeout: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FISCAL & AUTH */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-800/20 border-b border-slate-800/50 py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-purple-400">
                <Hash className="h-4 w-4" /> Officer & Tax Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Officer ID</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-white h-11"
                    value={config.cashier_id}
                    onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Officer PIN</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-white h-11"
                    value={config.cashier_pin}
                    onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-bold">VAT Tax Coefficient (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-slate-950 border-slate-800 text-purple-400 font-mono h-11"
                  value={config.vat_rate}
                  onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* ADG LOGIC & SUBCHARGE */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-800/20 border-b border-slate-800/50 py-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-amber-500">
                <Zap className="h-4 w-4" /> ADG & Subcharge
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">ADG Length</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 text-white h-11"
                    value={config.adg_length}
                    onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Fast Len</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 text-white h-11"
                    value={config.fast_code_length}
                    onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Subcharge Name (AM)</Label>
                <Input
                  className="bg-slate-950 border-slate-800 text-xs text-amber-200 h-11"
                  value={config.subcharge_name}
                  onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* REGISTRY: PAYMENT METHODS */}
        <Card className="bg-slate-900/40 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <CreditCard className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white">
                  Payment Protocol Registry
                </CardTitle>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                  Configure individual methods for this point
                </p>
              </div>
            </div>
            <Button
              onClick={addPaymentMethod}
              variant="outline"
              className="border-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all rounded-xl font-bold text-[10px] tracking-widest h-10 px-6"
            >
              <Plus className="h-4 w-4 mr-2" /> ADD NEW METHOD
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/50 text-slate-500 border-b border-slate-800 uppercase text-[9px] font-black tracking-widest">
                <tr>
                  <th className="p-6 text-center w-24">Link</th>
                  <th className="p-6 text-left">Display Name</th>
                  <th className="p-6 text-left">External iiko UUID</th>
                  <th className="p-6 text-left">Fiscal Mapping</th>
                  <th className="p-6 text-center w-24">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {config.payment_types.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`group hover:bg-blue-600/5 transition-all ${!pt.enabled && "opacity-40 grayscale"}`}
                  >
                    <td className="p-6 text-center">
                      <Switch
                        checked={pt.enabled}
                        onCheckedChange={(v) => updatePaymentMethod(idx, { enabled: v })}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </td>
                    <td className="p-6">
                      <Input
                        value={pt.Name}
                        onChange={(e) => updatePaymentMethod(idx, { Name: e.target.value })}
                        className="bg-slate-950/50 border-slate-800 font-bold text-white h-10 text-xs focus:border-blue-500"
                      />
                    </td>
                    <td className="p-6">
                      <Input
                        value={pt.Id}
                        onChange={(e) => updatePaymentMethod(idx, { Id: e.target.value })}
                        className="bg-slate-950/50 border-slate-800 font-mono text-xs text-slate-400 h-10 tracking-tighter"
                      />
                    </td>
                    <td className="p-6">
                      <Select
                        value={pt.PaymentType}
                        onValueChange={(v: any) => updatePaymentMethod(idx, { PaymentType: v })}
                      >
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 h-10 text-[10px] font-black tracking-widest uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">CASH</SelectItem>
                          <SelectItem value="paidAmountCard">CARD / EXTERNAL</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-6 text-center">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setConfig({ ...config, payment_types: config.payment_types.filter((_, i) => i !== idx) })
                        }
                        className="hover:bg-red-500/10 text-slate-600 hover:text-red-500"
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

        {/* SYSTEM FLAGS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Bypass Default ADG", key: "use_default_adg" },
            { label: "Enable Discount Calc", key: "use_discount" },
            { label: "Kitchen Name Source", key: "use_kitchen_name" },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-6 bg-slate-900/40 border border-slate-800 rounded-[1.5rem] shadow-xl"
            >
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">{item.label}</Label>
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
