import { useState, useEffect } from "react";
import { Save, Settings, Wifi, Hash, Zap, CreditCard, Clock, ShieldCheck } from "lucide-react";
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
  payment_types: [],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FullIikoConfig>(initialConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("fiscal_settings").select("*").maybeSingle();
      if (data) {
        setConfig({ ...initialConfig, ...data });
      }
      setLoading(false);
    }
    load();
  }, []);

  const save = async () => {
    // Вставляем как any, чтобы избежать ошибок типизации Supabase
    const { error } = await supabase.from("fiscal_settings").upsert({
      ...config,
      id: 1,
      updated_at: new Date().toISOString(),
    } as any);

    if (!error) toast.success("Конфигурация HDM сохранена");
    else toast.error("Ошибка сохранения");
  };

  if (loading) return <div className="p-10 text-center">Загрузка XML параметров...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 italic text-slate-700">
            <Settings className="text-blue-600" /> iiko HDM Armenia Config
          </h1>
        </div>
        <Button onClick={save} className="bg-green-600 hover:bg-green-700">
          <Save className="mr-2 h-4 w-4" /> Save Config
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CONNECTION */}
        <Card>
          <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wifi className="h-4 w-4" /> CONNECTION
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Host</Label>
                <Input value={config.host} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Port</Label>
                <Input value={config.port} onChange={(e) => setConfig({ ...config, port: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>KkmPassword</Label>
              <Input
                value={config.kkm_password}
                onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="space-y-1 text-xs text-muted-foreground">
                <Label>OpTimeout</Label>
                <Input
                  type="number"
                  value={config.op_timeout}
                  onChange={(e) => setConfig({ ...config, op_timeout: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <Label>KkmTimeout</Label>
                <Input
                  type="number"
                  value={config.kkm_timeout}
                  onChange={(e) => setConfig({ ...config, kkm_timeout: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FISCAL DATA */}
        <Card>
          <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Hash className="h-4 w-4" /> FISCAL & TAX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>CashierId</Label>
                <Input
                  value={config.cashier_id}
                  onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>CashierPin</Label>
                <Input
                  value={config.cashier_pin}
                  onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>VatRate (%)</Label>
              <Input
                type="number"
                value={config.vat_rate}
                onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Default ADG</Label>
              <Input
                value={config.default_adg}
                onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* CODES & GENERATION */}
        <Card>
          <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4" /> SUBCHARGE & ADG
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label>Subcharge Name (AM)</Label>
              <Input
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Sub. Code</Label>
                <Input
                  value={config.subcharge_code}
                  onChange={(e) => setConfig({ ...config, subcharge_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Sub. Unit</Label>
                <Input
                  value={config.subcharge_unit}
                  onChange={(e) => setConfig({ ...config, subcharge_unit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>ADG Len</Label>
                <Input
                  type="number"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fast Len</Label>
                <Input
                  type="number"
                  value={config.fast_code_length}
                  onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAYMENT TYPES LIST */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> PAYMENT TYPES MAPPING
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">iiko ID (External)</th>
                <th className="text-center p-3 font-medium">ExtPos</th>
                <th className="text-left p-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {config.payment_types.map((pt, idx) => (
                <tr key={pt.Id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{pt.Name}</td>
                  <td className="p-3 text-xs font-mono text-slate-400">{pt.Id}</td>
                  <td className="p-3 text-center">{pt.UseExtPos ? "✅" : "❌"}</td>
                  <td className="p-3 text-xs uppercase font-bold text-blue-600">{pt.PaymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {config.payment_types.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              Payment types will appear here after XML import or DB sync
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
