import { useState, useEffect } from "react";
import { Save, Settings, Wifi, Hash, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface IikoConfig {
  host: string; // <Host>
  port: string; // <Port>
  cashier_id: string; // <CashierId>
  cashier_pin: string; // <CashierPin>
  kkm_password: string; // <KkmPassword>
  vat_rate: number; // <VatRate>
  use_discount: boolean; // <UseDiscountInKkm>
  use_kitchen_name: boolean; // <UseKitchenName>
  default_adg: string; // <DefaultAdg>
  use_default_adg: boolean; // <UseDefaultAdg>
  subcharge_code: string; // <SubchargeAsDishCode>
  subcharge_name: string; // <SubchargeAsDishName>
  adg_length: number; // <AdgCodeFromProductCodeLength>
  fast_code_length: number; // <AdgCodeFromProductFastCodeLength>
}

const initialConfig: IikoConfig = {
  host: "192.168.9.19",
  port: "8080",
  cashier_id: "3",
  cashier_pin: "4321",
  kkm_password: "Aa1111Bb",
  vat_rate: 16.67,
  use_discount: true,
  use_kitchen_name: true,
  default_adg: "56.10",
  use_default_adg: true,
  subcharge_code: "999999",
  subcharge_name: "Հանրային սննդի կազմակերպում",
  adg_length: 1,
  fast_code_length: 1,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<IikoConfig>(initialConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("fiscal_settings").select("*").maybeSingle();
      if (data) setConfig({ ...initialConfig, ...data });
      setLoading(false);
    }
    load();
  }, []);

  const save = async () => {
    const { error } = await supabase.from("fiscal_settings").upsert({ ...config, id: 1 });
    if (!error) toast.success("Конфигурация XML сохранена");
    else toast.error("Ошибка записи в базу");
  };

  if (loading) return <div className="p-10 text-center text-lg">Загрузка iiko config...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Settings className="text-blue-600" /> Настройки iiko HDM (Плагин)
        </h1>
        <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">
          <Save className="mr-2 h-4 w-4" /> Сохранить XML
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* КАРТА 1: Сеть и Связь */}
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Связь (Host/Port)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Host IP</Label>
              <Input value={config.host} onChange={(e) => setConfig({ ...config, host: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={config.port} onChange={(e) => setConfig({ ...config, port: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>KkmPassword</Label>
              <Input
                type="password"
                value={config.kkm_password}
                onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* КАРТА 2: Персонал и Налоги */}
        <Card className="border-t-4 border-t-purple-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase flex items-center gap-2">
              <Hash className="h-4 w-4" /> Кассир и НДС
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>CashierId</Label>
                <Input
                  value={config.cashier_id}
                  onChange={(e) => setConfig({ ...config, cashier_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CashierPin</Label>
                <Input
                  value={config.cashier_pin}
                  onChange={(e) => setConfig({ ...config, cashier_pin: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>VatRate (НДС %)</Label>
              <Input
                type="number"
                value={config.vat_rate}
                onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default ADG</Label>
              <Input
                value={config.default_adg}
                onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* КАРТА 3: Генерация кодов */}
        <Card className="border-t-4 border-t-amber-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm uppercase flex items-center gap-2">
              <Zap className="h-4 w-4" /> Генерация кодов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ADG Длина (1)</Label>
                <Input
                  type="number"
                  value={config.adg_length}
                  onChange={(e) => setConfig({ ...config, adg_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>FastCode Длина</Label>
                <Input
                  type="number"
                  value={config.fast_code_length}
                  onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subcharge Code</Label>
              <Input
                value={config.subcharge_code}
                onChange={(e) => setConfig({ ...config, subcharge_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subcharge Name</Label>
              <Input
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-50 border shadow-inner">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <Label className="font-semibold cursor-pointer">Use Default ADG</Label>
            <Switch
              checked={config.use_default_adg}
              onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <Label className="font-semibold cursor-pointer">Use Discount</Label>
            <Switch checked={config.use_discount} onCheckedChange={(v) => setConfig({ ...config, use_discount: v })} />
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <Label className="font-semibold cursor-pointer">Use Kitchen Name</Label>
            <Switch
              checked={config.use_kitchen_name}
              onCheckedChange={(v) => setConfig({ ...config, use_kitchen_name: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
