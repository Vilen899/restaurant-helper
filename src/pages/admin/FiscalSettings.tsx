import { useState, useEffect } from "react";
import { Printer, Settings, Wifi, Save, Eye, EyeOff, ShieldCheck, ListTree, Hash, Zap, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type FiscalDriver = "hdm_iiko" | "custom" | "hdm";

interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: FiscalDriver;
  host: string; // <Host> 192.168.9.19
  port: string; // <Port> 8080
  api_login: string; // <CashierId> 3
  api_password: string; // <CashierPin> 4321
  kkm_password: string; // <KkmPassword> Aa1111Bb
  vat_rate: number; // <VatRate> 16.67
  default_adg: string; // <DefaultAdg> 56.10
  use_default_adg: boolean;
  subcharge_name: string;
  subcharge_code: string; // <SubchargeAsDishCode> 999999
  adg_code_length: number; // <AdgCodeFromProductCodeLength> 1
  fast_code_length: number; // <AdgCodeFromProductFastCodeLength> 1
}

const defaultConfig: FiscalConfig = {
  location_id: "",
  enabled: false,
  driver: "hdm_iiko",
  host: "192.168.9.19",
  port: "8080",
  api_login: "3",
  api_password: "4321",
  kkm_password: "Aa1111Bb",
  vat_rate: 16.67,
  default_adg: "56.10",
  use_default_adg: true,
  subcharge_name: "Հանրային սննդի կազմակերպում",
  subcharge_code: "999999",
  adg_code_length: 1,
  fast_code_length: 1,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FiscalConfig>(defaultConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) fetchSettings(selectedLocation);
  }, [selectedLocation]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
    if (data && data.length > 0) {
      setLocations(data);
      setSelectedLocation(data[0].id);
    }
    setLoading(false);
  };

  const fetchSettings = async (locationId: string) => {
    setLoading(true);
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locationId).maybeSingle();
    if (data) {
      setConfig({ ...defaultConfig, ...data });
    } else {
      setConfig({ ...defaultConfig, location_id: locationId });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("fiscal_settings").upsert({ ...config, location_id: selectedLocation });
    if (!error) toast.success("Настройки iiko сохранены");
    else toast.error("Ошибка сохранения");
  };

  if (loading)
    return (
      <div className="p-10 text-center text-muted-foreground animate-pulse text-lg">Загрузка конфигурации ККМ...</div>
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <PageHeader title="Конфигурация iiko HDM" description="Полное соответствие XML-структуре драйвера" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* СЕТЬ И ПОРТ */}
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3 bg-blue-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" /> СЕТЕВОЙ УЗЕЛ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Host (IP ККМ)</Label>
              <Input
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="192.168.9.19"
              />
            </div>
            <div className="space-y-2">
              <Label>Port (Порт)</Label>
              <Input
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
                placeholder="8080"
              />
            </div>
          </CardContent>
        </Card>

        {/* ГЕНЕРАЦИЯ И КОДЫ */}
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-3 bg-orange-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" /> ГЕНЕРАЦИЯ КОДОВ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Длина ADG</Label>
                <Input
                  type="number"
                  value={config.adg_code_length}
                  onChange={(e) => setConfig({ ...config, adg_code_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Длина FastCode</Label>
                <Input
                  type="number"
                  value={config.fast_code_length}
                  onChange={(e) => setConfig({ ...config, fast_code_length: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Код услуги (Subcharge)</Label>
              <Input
                value={config.subcharge_code}
                onChange={(e) => setConfig({ ...config, subcharge_code: e.target.value })}
                placeholder="999999"
              />
            </div>
          </CardContent>
        </Card>

        {/* АВТОРИЗАЦИЯ */}
        <Card className="border-purple-200 shadow-sm">
          <CardHeader className="pb-3 bg-purple-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" /> ДОСТУП
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>CashierId</Label>
                <Input value={config.api_login} onChange={(e) => setConfig({ ...config, api_login: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CashierPin</Label>
                <Input
                  type="password"
                  value={config.api_password}
                  onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                />
              </div>
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
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
              <Label className="font-bold">Модуль ККМ Активен</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.use_default_adg}
                onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
              />
              <Label>
                Использовать ADG: <span className="text-blue-600 font-mono">{config.default_adg}</span>
              </Label>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full md:w-auto px-10 bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" /> Сохранить XML Конфиг
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
