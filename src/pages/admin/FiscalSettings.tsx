import { useState, useEffect } from "react";
import { Save, Settings, Wifi, Hash, Zap, CreditCard } from "lucide-react";
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
          // Принудительно приводим data к any, чтобы обойти ошибку TS2339
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
      toast.success("Конфигурация iiko HDM сохранена");
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    }
  };

  if (loading) return <div className="p-10 text-center">Загрузка iiko config...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
          <Settings className="text-blue-600 h-6 w-6" /> IIKO HDM ARMENIA
        </h1>
        <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 h-11 px-8">
          <Save className="mr-2 h-4 w-4" /> Save XML
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="bg-slate-50 border-b py-3 font-bold text-xs uppercase text-slate-500">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Network Access
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Host</Label>
                <Input value={config.host} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Port</Label>
                <Input value={config.port} onChange={(e) => setConfig({ ...config, port: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kkm Password</Label>
              <Input
                type="password"
                value={config.kkm_password}
                onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b py-3 font-bold text-xs uppercase text-slate-500">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4" /> Fiscal & Tax
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cashier ID</Label>
                <Input
                  value={config.cashier_id}
                  onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cashier PIN</Label>
                <Input
                  value={config.cashier_pin}
                  onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VAT Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.vat_rate}
                onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-50 border-b py-3 font-bold text-xs uppercase text-slate-500">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Generation
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">ADG Code Len</Label>
                <Input
                  type="number"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fast Code Len</Label>
                <Input
                  type="number"
                  value={config.fast_code_length}
                  onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default ADG</Label>
              <Input
                value={config.default_adg}
                onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Use Default ADG", key: "use_default_adg" },
          { label: "Use Discount in KKM", key: "use_discount" },
          { label: "Use Kitchen Names", key: "use_kitchen_name" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-xl border shadow-sm">
            <Label className="text-sm font-bold">{item.label}</Label>
            <Switch
              checked={(config as any)[item.key]}
              onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })}
            />
          </div>
        ))}
      </div>

      <Card className="shadow-md overflow-hidden border-slate-200">
        <CardHeader className="bg-slate-800 text-white py-3">
          <CardTitle className="text-xs uppercase flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Types mapping
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 border-b">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">External ID</th>
                <th className="text-center p-4">ExtPOS</th>
                <th className="text-right p-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(config.payment_types || []).map((pt, idx) => (
                <tr key={pt.Id || idx}>
                  <td className="p-4 font-semibold">{pt.Name}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{pt.Id}</td>
                  <td className="p-4 text-center">{pt.UseExtPos ? "✅" : "❌"}</td>
                  <td className="p-4 text-right uppercase text-[10px] font-black text-blue-600">{pt.PaymentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
