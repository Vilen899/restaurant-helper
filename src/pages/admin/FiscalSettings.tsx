import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, ShieldCheck, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentTypeItem {
  Id: string;
  Name: string;
  UseExtPos: boolean;
  PaymentType: "paidAmount" | "paidAmountCard";
}

interface FullIikoConfig {
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

const initialConfig: FullIikoConfig = {
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
  payment_types: [
    { Id: "09322f46-578a-d210-add7-eec222a08871", Name: "Կանխիկ", UseExtPos: true, PaymentType: "paidAmount" },
    { Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241", Name: "Bank Cards", UseExtPos: false, PaymentType: "paidAmountCard" },
    { Id: "6dcb7577-458d-4215-b29f-08ee5dc3dbce", Name: "Glovo", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "c58e022d-96f2-4f50-b94f-3831f3c90265", Name: "Yandex", UseExtPos: true, PaymentType: "paidAmountCard" },
    { Id: "3859f307-61e4-4bcd-9314-757f831d8c23", Name: "Idram", UseExtPos: true, PaymentType: "paidAmountCard" },
  ],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullIikoConfig>(initialConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("fiscal_settings").select("*").maybeSingle();
        if (error) throw error;
        if (data) {
          const rawData = data as any;
          setConfig({
            ...initialConfig,
            ...rawData,
            payment_types: Array.isArray(rawData.payment_types) ? rawData.payment_types : initialConfig.payment_types,
          });
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const save = async () => {
    try {
      const { error } = await supabase.from("fiscal_settings").upsert({
        ...config,
        id: 1,
        updated_at: new Date().toISOString(),
      } as any);

      if (error) throw error;
      toast.success("System configuration updated successfully");
    } catch (err: any) {
      toast.error("System error: " + err.message);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-blue-400 font-mono">
        INITIALIZING SYSTEM...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/50">
              <Cpu className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
                HDM ARMENIA <span className="text-blue-500">PRO</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Engine Active</p>
              </div>
            </div>
          </div>
          <Button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-10 rounded-xl transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            <Save className="mr-2 h-5 w-5" /> SYNC CONFIG
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* NETWORK CONFIG */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-800/50 py-4 px-6 bg-slate-800/20">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-400">
                <Wifi className="h-4 w-4" /> Link Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Host Endpoint</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Port ID</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Access Password</Label>
                <Input
                  type="password"
                  className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                  value={config.kkm_password}
                  onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* FISCAL CONFIG */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-800/50 py-4 px-6 bg-slate-800/20">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-purple-400">
                <Hash className="h-4 w-4" /> Fiscal Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Officer ID</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.cashier_id}
                    onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Officer PIN</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.cashier_pin}
                    onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Tax Coefficient (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                  value={config.vat_rate}
                  onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* GEN LOGIC */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-800/50 py-4 px-6 bg-slate-800/20">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-amber-400">
                <Zap className="h-4 w-4" /> Code Logic
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">ADG Length</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.adg_length}
                    onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Fast Length</Label>
                  <Input
                    type="number"
                    className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                    value={config.fast_code_length}
                    onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">System ADG Base</Label>
                <Input
                  className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white font-mono"
                  value={config.default_adg}
                  onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SWITCHES BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Bypass Global ADG", key: "use_default_adg", icon: <ShieldCheck className="h-4 w-4" /> },
            { label: "Calculate Discounts", key: "use_discount", icon: <Activity className="h-4 w-4" /> },
            { label: "Kitchen Data Source", key: "use_kitchen_name", icon: <Cpu className="h-4 w-4" /> },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-5 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl transition-all hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-3">
                <div className="text-blue-500">{item.icon}</div>
                <Label className="text-sm font-black text-slate-300 uppercase tracking-tight cursor-pointer">
                  {item.label}
                </Label>
              </div>
              <Switch
                className="data-[state=checked]:bg-blue-600"
                checked={(config as any)[item.key]}
                onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })}
              />
            </div>
          ))}
        </div>

        {/* PAYMENT TABLE */}
        <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 py-5 px-8 flex flex-row justify-between items-center">
            <CardTitle className="text-[12px] uppercase font-black tracking-[0.2em] flex items-center gap-3 text-slate-400">
              <CreditCard className="h-5 w-5 text-blue-500" /> Payment Mapping Registry
            </CardTitle>
            <span className="text-[10px] bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-800 font-bold uppercase tracking-widest">
              Global Sync Active
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/80 text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="text-left p-6 font-black uppercase tracking-widest text-[10px]">Registry Name</th>
                  <th className="text-left p-6 font-black uppercase tracking-widest text-[10px]">Reference UUID</th>
                  <th className="text-center p-6 font-black uppercase tracking-widest text-[10px]">
                    External Terminal
                  </th>
                  <th className="text-right p-6 font-black uppercase tracking-widest text-[10px]">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {(config.payment_types || []).map((pt, idx) => (
                  <tr key={pt.Id || idx} className="hover:bg-blue-900/10 transition-colors group">
                    <td className="p-6 font-black text-white group-hover:text-blue-400 transition-colors">{pt.Name}</td>
                    <td className="p-6 font-mono text-[11px] text-slate-500 tracking-tighter">{pt.Id}</td>
                    <td className="p-6 text-center">
                      <div
                        className={`mx-auto w-16 py-1 rounded font-black text-[9px] uppercase tracking-widest ${pt.UseExtPos ? "bg-green-900/30 text-green-500 border border-green-800" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
                      >
                        {pt.UseExtPos ? "LINKED" : "OFFLINE"}
                      </div>
                    </td>
                    <td className="p-6 text-right uppercase text-[10px] font-black text-blue-400 bg-blue-900/5">
                      {pt.PaymentType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
