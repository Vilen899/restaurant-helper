import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, Plus, Trash2, Power } from "lucide-react";
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
  enabled: boolean; // Добавили поле для вкл/выкл
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
      setConfig({ ...initialConfig, location_id: locId, payment_types: [] });
    }
    setLoading(false);
  }

  const addPaymentMethod = () => {
    const newMethod: PaymentTypeItem = {
      Id: crypto.randomUUID(),
      Name: "New Method",
      UseExtPos: true,
      PaymentType: "paidAmountCard",
      enabled: true,
    };
    setConfig({ ...config, payment_types: [...config.payment_types, newMethod] });
  };

  const updatePaymentMethod = (index: number, fields: Partial<PaymentTypeItem>) => {
    const updated = [...config.payment_types];
    updated[index] = { ...updated[index], ...fields };
    setConfig({ ...config, payment_types: updated });
  };

  const removePaymentMethod = (index: number) => {
    setConfig({ ...config, payment_types: config.payment_types.filter((_, i) => i !== index) });
  };

  const save = async () => {
    if (!config.location_id) return toast.error("Select location");
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "location_id" },
    );

    if (!error) toast.success("Configuration saved for location");
    else toast.error("Error: " + error.message);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER & SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-black text-blue-500 tracking-widest">
                Active Point Control
              </Label>
              <Select value={config.location_id} onValueChange={loadSettings}>
                <SelectTrigger className="bg-slate-950 border-slate-800 w-[240px] rounded-xl h-11 focus:ring-blue-500">
                  <SelectValue placeholder="Select Location" />
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
          <Button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-10 rounded-2xl shadow-xl shadow-blue-600/10 active:scale-95 transition-all"
          >
            <Save className="mr-2 h-5 w-5" /> SYNC POINT DATA
          </Button>
        </div>

        {/* PAYMENTS CONTROL PANEL */}
        <Card className="bg-slate-900/40 border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-400" />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-300">
                Payment Registry & Logic
              </CardTitle>
            </div>
            <Button
              onClick={addPaymentMethod}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 text-slate-300 h-9 rounded-xl text-xs font-bold"
            >
              <Plus className="h-4 w-4 mr-2" /> ADD METHOD
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="p-4 w-16 text-center">Status</th>
                    <th className="p-4">Method Name</th>
                    <th className="p-4">External UUID (iiko)</th>
                    <th className="p-4">Terminal Protocol</th>
                    <th className="p-4 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {config.payment_types.map((pt, idx) => (
                    <tr
                      key={idx}
                      className={`transition-colors ${pt.enabled ? "bg-transparent" : "bg-red-950/10 opacity-60"}`}
                    >
                      <td className="p-4 text-center">
                        <Switch
                          checked={pt.enabled}
                          onCheckedChange={(v) => updatePaymentMethod(idx, { enabled: v })}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          value={pt.Name}
                          onChange={(e) => updatePaymentMethod(idx, { Name: e.target.value })}
                          className="bg-slate-950/50 border-slate-800 h-9 text-xs font-bold focus:border-purple-500"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          value={pt.Id}
                          onChange={(e) => updatePaymentMethod(idx, { Id: e.target.value })}
                          className="bg-slate-950/50 border-slate-800 h-9 text-xs font-mono text-slate-400"
                        />
                      </td>
                      <td className="p-4">
                        <Select
                          value={pt.PaymentType}
                          onValueChange={(v: any) => updatePaymentMethod(idx, { PaymentType: v })}
                        >
                          <SelectTrigger className="bg-slate-950/50 border-slate-800 h-9 text-[10px] font-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="paidAmount">CASH (paidAmount)</SelectItem>
                            <SelectItem value="paidAmountCard">CARD (paidAmountCard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => removePaymentMethod(idx)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {config.payment_types.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-slate-500 font-mono text-xs uppercase tracking-widest"
                      >
                        No payment methods configured for this point
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* OTHER SETTINGS (Same as before but stylized) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Блок с IP и Кассиром оставим таким же компактным, как раньше */}
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Wifi className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Endpoint & Auth</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase">Host</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase">Port</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/40 border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <Hash className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Fiscal Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase">Officer ID</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.cashier_id}
                  onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase">Tax %</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800 h-10"
                  value={config.vat_rate}
                  onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
