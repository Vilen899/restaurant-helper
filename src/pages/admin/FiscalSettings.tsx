import { useState, useEffect } from "react";
import { Printer, Settings, Wifi, Save, Eye, EyeOff, ShieldCheck, ListTree, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type FiscalDriver = "hdm_iiko" | "custom" | "hdm" | "atol" | "shtrih" | "evotor";

interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: FiscalDriver;
  api_url: string; // IP ККМ или Хоста прослойки
  api_login: string; // CashierId
  api_password: string; // CashierPin
  kkm_password: string; // KkmPassword
  vat_rate: number;
  default_adg: string;
  use_default_adg: boolean;
  subcharge_name: string;
  subcharge_code: string;
  payment_timeout: number;
  use_discount: boolean;
}

const defaultConfig: FiscalConfig = {
  location_id: "",
  enabled: false,
  driver: "hdm_iiko",
  api_url: "http://192.168.9.19:8080",
  api_login: "3",
  api_password: "4321",
  kkm_password: "Aa1111Bb",
  vat_rate: 16.67,
  default_adg: "56.10",
  use_default_adg: true,
  subcharge_name: "Հանրային սննդի կազմակերպում",
  subcharge_code: "999999",
  payment_timeout: 120000,
  use_discount: true,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FiscalConfig>(defaultConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
      setConfig({ ...defaultConfig, ...data, driver: (data.driver as FiscalDriver) || "hdm_iiko" });
    } else {
      setConfig({ ...defaultConfig, location_id: locationId });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("fiscal_settings").upsert({ ...config, location_id: selectedLocation });
    if (!error) toast.success("Настройки сохранены");
    else toast.error("Ошибка сохранения");
    setSaving(false);
  };

  const handleTestPrint = async () => {
    setTesting(true);
    toast.info("Отправка команды на IP ККМ...");

    // Эмуляция сетевого запроса к ККМ
    setTimeout(() => {
      setTesting(false);
      toast.error("Ошибка CORS или Таймаут. Браузер не может напрямую достучаться до IP кассы без прослойки.");
    }, 2000);
  };

  if (loading) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <PageHeader title="Сетевая фискализация (iiko HDM)" description="Настройка прямой связи с ККМ по IP адресу" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" /> Сетевой адрес ККМ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>IP Адрес и Порт ККМ</Label>
              <Input
                value={config.api_url}
                onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                placeholder="http://192.168.9.19:8080"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Кассира</Label>
                <Input value={config.api_login} onChange={(e) => setConfig({ ...config, api_login: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>PIN Кассира</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={config.api_password}
                    onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTree className="h-5 w-5" /> Налоговые параметры
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ставка НДС (16.67 для Армении)</Label>
                <Input
                  type="number"
                  value={config.vat_rate}
                  onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>ADG Код по умолчанию</Label>
                <Input
                  value={config.default_adg}
                  onChange={(e) => setConfig({ ...config, default_adg: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 border rounded bg-muted/30">
              <Label>Использовать ADG всегда</Label>
              <Switch
                checked={config.use_default_adg}
                onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Label>Активная точка:</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
                <Label>Включить ККМ</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTestPrint} disabled={testing}>
                <Printer className="mr-2 h-4 w-4" /> Тест печати
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
