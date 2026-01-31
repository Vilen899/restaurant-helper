import { useState, useEffect } from "react";
import { Printer, Settings, Wifi, WifiOff, TestTube, Save, AlertTriangle, Eye, EyeOff, ListTree } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: "hdm_iiko" | "custom";
  api_url: string;
  api_login: string; // CashierId
  api_password: string; // CashierPin
  kkm_password: string;
  vat_rate: number;
  default_adg: string;
  use_default_adg: boolean;
  subcharge_name: string;
  subcharge_code: string;
  default_timeout: number;
  payment_timeout: number;
  use_kitchen_name: boolean;
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
  default_timeout: 30000,
  payment_timeout: 120000,
  use_kitchen_name: true,
  use_discount: true,
};

export default function FiscalSettingsPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<FiscalConfig>(defaultConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [connected, setConnected] = useState(false);
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
    if (data) {
      setLocations(data);
      if (data.length > 0) setSelectedLocation(data[0].id);
    }
    setLoading(false);
  };

  const fetchSettings = async (locationId: string) => {
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locationId).maybeSingle();
    if (data) {
      setConfig({ ...data, driver: "hdm_iiko" });
    } else {
      setConfig({ ...defaultConfig, location_id: locationId });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("fiscal_settings").upsert({
        ...config,
        location_id: selectedLocation,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Настройки iiko KKM сохранены");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Интеграция iiko KKM" description="Настройка фискализации по протоколу iiko (HDM Armenia)" />

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label>Рабочая точка:</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-64 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {config.enabled ? (
            <div className="flex items-center text-green-600 gap-2 font-medium">
              <Wifi className="h-4 w-4" /> Активна
            </div>
          ) : (
            <div className="text-muted-foreground">Выключена</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Основные сетевые настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Сетевой узел (Host)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Host / IP Address</Label>
              <Input
                value={config.api_url}
                onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                placeholder="192.168.9.19:8080"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cashier ID</Label>
                <Input value={config.api_login} onChange={(e) => setConfig({ ...config, api_login: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cashier PIN</Label>
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
            <div className="space-y-2">
              <Label>Пароль ККМ (KkmPassword)</Label>
              <Input
                value={config.kkm_password}
                onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Налоговые настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Налоги и ADG коды</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ставка НДС (%)</Label>
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
            </div>
            <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
              <Label>Использовать ADG по умолчанию</Label>
              <Switch
                checked={config.use_default_adg}
                onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Название услуги (Subcharge Name)</Label>
              <Input
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Дополнительные параметры */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Параметры работы</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Скидки в ККМ</Label>
                <Switch
                  checked={config.use_discount}
                  onCheckedChange={(v) => setConfig({ ...config, use_discount: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Имена из кухни</Label>
                <Switch
                  checked={config.use_kitchen_name}
                  onCheckedChange={(v) => setConfig({ ...config, use_kitchen_name: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Включить ККТ</Label>
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Таймаут ККМ (мс)</Label>
              <Input
                type="number"
                value={config.payment_timeout}
                onChange={(e) => setConfig({ ...config, payment_timeout: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-end pb-1">
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? (
                  "Сохранение..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Сохранить настройки iiko
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
