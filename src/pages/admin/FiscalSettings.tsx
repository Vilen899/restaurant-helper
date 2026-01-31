import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, MapPin } from "lucide-react";
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
  PaymentType: string;
}

interface FullConfig {
  location_id: string;
  host: string;
  port: string;
  cashier_id: string;
  cashier_pin: string;
  kkm_password: string;
  vat_rate: number;
  adg_length: number;
  fast_code_length: number;
  default_adg: string;
  subcharge_code: string;
  subcharge_name: string;
  subcharge_unit: string;
  use_discount: boolean;
  use_kitchen_name: boolean;
  use_default_adg: boolean;
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
  adg_length: 1,
  fast_code_length: 1,
  default_adg: "56.10",
  subcharge_code: "999999",
  subcharge_name: "Հանրային սննդի կազմակերպում",
  subcharge_unit: "հատ․",
  use_discount: true,
  use_kitchen_name: true,
  use_default_adg: true,
  payment_types: [
    { Id: "09322f46-578a-d210-add7-eec222a08871", Name: "Կանխիկ", UseExtPos: true, PaymentType: "paidAmount" },
    { Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241", Name: "Bank Cards", UseExtPos: false, PaymentType: "paidAmountCard" },
  ],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullConfig>(initialConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Загрузка списка всех точек
  useEffect(() => {
    async function getLocations() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data) {
        setLocations(data);
        if (data.length > 0) loadSettings(data[0].id);
      }
    }
    getLocations();
  }, []);

  // 2. Загрузка настроек для конкретной точки
  async function loadSettings(locId: string) {
    setLoading(true);
    const { data, error } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
    if (data) {
      setConfig({ ...initialConfig, ...(data as any), location_id: locId });
    } else {
      setConfig({ ...initialConfig, location_id: locId });
    }
    setLoading(false);
  }

  const save = async () => {
    if (!config.location_id) return toast.error("Select location first");
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "location_id" },
    );

    if (!error) toast.success("Configuration synced for this location");
    else toast.error("Sync error: " + error.message);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP PANEL: LOCATION SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1 w-full md:w-64">
              <Label className="text-[10px] uppercase font-black text-blue-400 tracking-[0.2em]">
                Select Deployment Point
              </Label>
              <Select value={config.location_id} onValueChange={(val) => loadSettings(val)}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white h-10">
                  <SelectValue placeholder="Choose location..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={save}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-12 rounded-xl shadow-xl shadow-blue-600/20"
          >
            <Save className="mr-2 h-5 w-5" /> SYNC POINT
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-blue-400 font-mono tracking-widest">
            LOADING POINT DATA...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* NETWORK */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 bg-slate-800/20 py-3 px-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-400">
                  <Wifi className="h-4 w-4" /> Link
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Host</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Port</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Password</Label>
                  <Input
                    type="password"
                    className="bg-slate-950 border-slate-800 text-white"
                    value={config.kkm_password}
                    onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* FISCAL */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 bg-slate-800/20 py-3 px-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-purple-400">
                  <Hash className="h-4 w-4" /> Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Officer ID</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 text-white"
                      value={config.cashier_id}
                      onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">PIN</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 text-white"
                      value={config.cashier_pin}
                      onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="bg-slate-950 border-slate-800 text-white font-mono"
                    value={config.vat_rate}
                    onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* LOGIC */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-800/50 bg-slate-800/20 py-3 px-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-amber-400">
                  <Zap className="h-4 w-4" /> Logic
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">ADG Len</Label>
                    <Input
                      type="number"
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      value={config.adg_length}
                      onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Fast Len</Label>
                    <Input
                      type="number"
                      className="bg-slate-950 border-slate-800 text-white font-mono"
                      value={config.fast_code_length}
                      onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Base ADG</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-white font-mono"
                    value={config.default_adg}
                    onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-slate-500 border-b border-slate-800 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-5 text-left">Registry Name</th>
                <th className="p-5 text-left">UUID</th>
                <th className="p-5 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {config.payment_types.map((pt, i) => (
                <tr key={i} className="hover:bg-blue-900/10">
                  <td className="p-5 font-bold text-white">{pt.Name}</td>
                  <td className="p-5 font-mono text-slate-500 text-xs">{pt.Id}</td>
                  <td className="p-5 text-right font-black text-blue-400 text-[10px]">{pt.PaymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
