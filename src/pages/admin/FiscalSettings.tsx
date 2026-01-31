import { useState, useEffect } from "react";
import { Save, Cpu, Wifi, Hash, Zap, CreditCard, Plus, Trash2, MapPin } from "lucide-react";
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

// Твои эталонные методы оплаты из XML
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
  subcharge_name: "Հанրային սննդի կազմակերպում",
  subcharge_adg: "56.10",
  subcharge_unit: "հատ․",
  op_timeout: 30000,
  kkm_timeout: 120000,
  adg_length: 1,
  fast_code_length: 1,
  payment_types: xmlDefaultPayments, // Теперь по умолчанию они всегда здесь
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
        payment_types:
          Array.isArray(raw.payment_types) && raw.payment_types.length > 0 ? raw.payment_types : xmlDefaultPayments, // Если в базе пусто, берем из XML
      });
    } else {
      setConfig({ ...initialConfig, location_id: locId, payment_types: xmlDefaultPayments });
    }
    setLoading(false);
  }

  const updatePayment = (index: number, fields: Partial<PaymentTypeItem>) => {
    const updated = [...config.payment_types];
    updated[index] = { ...updated[index], ...fields };
    setConfig({ ...config, payment_types: updated });
  };

  const save = async () => {
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "location_id" },
    );

    if (!error) toast.success("Point configuration synced");
    else toast.error("Sync error: " + error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-blue-500 font-mono tracking-widest">
        CONNECTING_TO_FISCAL_CORE...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">HDM Point Manager</h1>
              <div className="flex items-center gap-2">
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-blue-600/20"
          >
            <Save className="mr-2 h-4 w-4" /> SAVE CONFIGURATION
          </Button>
        </div>

        {/* PAYMENT METHODS - ТЕПЕРЬ С ПЕРЕКЛЮЧАТЕЛЯМИ */}
        <Card className="bg-slate-900/40 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-900/60 border-b border-slate-800 p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-purple-500" /> Payment Methods Routing
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/50 text-slate-500 border-b border-slate-800 uppercase text-[9px] font-black">
                <tr>
                  <th className="p-5 text-center w-20">Active</th>
                  <th className="p-5 text-left">Name</th>
                  <th className="p-5 text-left">iiko External ID (UUID)</th>
                  <th className="p-5 text-left">Fiscal Type</th>
                  <th className="p-5 text-center w-20">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {config.payment_types.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`transition-all ${!pt.enabled ? "opacity-30 grayscale" : "hover:bg-blue-600/5"}`}
                  >
                    <td className="p-5 text-center">
                      <Switch
                        checked={pt.enabled}
                        onCheckedChange={(v) => updatePayment(idx, { enabled: v })}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </td>
                    <td className="p-5">
                      <Input
                        value={pt.Name}
                        onChange={(e) => updatePayment(idx, { Name: e.target.value })}
                        className="bg-slate-950 border-slate-800 h-9 text-xs font-bold"
                      />
                    </td>
                    <td className="p-5">
                      <Input
                        value={pt.Id}
                        onChange={(e) => updatePayment(idx, { Id: e.target.value })}
                        className="bg-slate-950 border-slate-800 h-9 text-[11px] font-mono text-slate-400"
                      />
                    </td>
                    <td className="p-5">
                      <Select value={pt.PaymentType} onValueChange={(v: any) => updatePayment(idx, { PaymentType: v })}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 h-9 text-[10px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="paidAmount">CASH</SelectItem>
                          <SelectItem value="paidAmountCard">CARD / EXT</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-5 text-center">
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
            <div className="p-4 bg-slate-950/30">
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
                variant="ghost"
                className="text-xs font-bold text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3 w-3 mr-2" /> ADD CUSTOM METHOD
              </Button>
            </div>
          </div>
        </Card>

        {/* TECHNICAL PARAMS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/40 border-slate-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
              <Wifi className="h-3 w-3" /> Connection
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px]">Host</Label>
                <Input
                  className="bg-slate-950 border-slate-800"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Port</Label>
                <Input
                  className="bg-slate-950 border-slate-800"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/40 border-slate-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
              <Zap className="h-3 w-3" /> Logic
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px]">ADG Len</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Op Timeout</Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-800"
                  value={config.op_timeout}
                  onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
