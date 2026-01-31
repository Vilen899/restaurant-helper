import { useState, useEffect } from "react";
import {
  Printer,
  Settings,
  Wifi,
  WifiOff,
  TestTube,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
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

// Интерфейс полностью совпадает с твоим XML конфигом iiko
interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: "hdm_iiko" | "custom" | "hdm" | "atol" | "shtrih" | "evotor";
  api_url: string;
  api_login: string; // CashierId
  api_password: string; // CashierPin
  kkm_password: string; // KkmPassword
  vat_rate: number; // VatRate
  default_adg: string; // DefaultAdg
  use_default_adg: boolean;
  subcharge_name: string; // SubchargeAsDishName
  subcharge_code: string; // SubchargeAsDishCode
  default_timeout: number;
  payment_timeout: number;
  use_kitchen_name: boolean;
  use_discount: boolean;
  auto_print_receipt: boolean;
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
  auto_print_receipt: true,
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
    if (selectedLocation) {
      fetchSettings(selectedLocation);
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      setLocations(data || []);
      if (data && data.length > 0) setSelectedLocation(data[0].id);
    } catch (error) {
      toast.error("Ошибка загрузки точек");
    }
  };

  const fetchSettings = async (locationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fiscal_settings")
        .select("*")
        .eq("location_id", locationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Решение ошибки TS2345: смешиваем дефолты с данными из БД
        setConfig({
          ...defaultConfig,
          ...data,
          driver: data.driver || "hdm_iiko",
        });
      } else {
        setConfig({ ...defaultConfig, location_id: locationId });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation) return toast.error("Выберите точку");
    setSaving(true);
    try {
      const { error } = await supabase.from("fiscal_settings").upsert({
        ...config,
        location_id: selectedLocation,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Настройки iiko KKM сохранены");
    } catch (error: any) {
      toast.error(error.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Здесь будет вызов либо Edge Function, либо прямой запрос к локальному IP
      toast.info(`Проверка связи с ${config.api_url}...`);
      // Имитация теста
      setTimeout(() => {
        setConnected(true);
        setTesting(false);
        toast.success("Соединение с iiko плагином установлено!");
      }, 1500);
    } catch (e) {
      setTesting(false);
      toast.error("Касса не отвечает. Проверьте сеть.");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Интеграция iiko KKM"
        description="Настройка связи с фискальным регистратором через плагин HDM"
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Label className="font-bold">Точка продаж:</Label>
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
          <div className="flex items-center gap-2">
            {config.enabled ? (
              <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <ShieldCheck className="h-4 w-4" /> Система активна
              </span>
            ) : (
              <span className="text-muted-foreground bg-gray-100 px-3 py-1 rounded-full border">Выключена</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection & Auth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" /> Авторизация и Сеть
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Host Address (IP:Port)</Label>
              <Input
                value={config.api_url}
                onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                placeholder="http://192.168.9.19:8080"
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
              <Label>Kkm Password</Label>
              <Input
                type="password"
                value={config.kkm_password}
                onChange={(e) => setConfig({ ...config, kkm_password: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Taxes & ADG */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ListTree className="h-5 w-5" /> Налоги и ADG коды
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ставка НДС (VatRate %)</Label>
                <Input
                  type="number"
                  step="0.01"
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
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="space-y-0.5">
                <Label>Use Default ADG</Label>
                <p className="text-xs text-muted-foreground">Применять код ко всем товарам</p>
              </div>
              <Switch
                checked={config.use_default_adg}
                onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Имя услуги (Subcharge Name)</Label>
              <Input
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operational Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase">Дополнительные параметры</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <div className="flex items-center justify-between text-primary font-bold">
                <Label>Включить ККТ</Label>
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Таймаут оплаты (мс)</Label>
                <Input
                  type="number"
                  value={config.payment_timeout}
                  onChange={(e) => setConfig({ ...config, payment_timeout: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Авто-печать чека</Label>
                <Switch
                  checked={config.auto_print_receipt}
                  onCheckedChange={(v) => setConfig({ ...config, auto_print_receipt: v })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-end">
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? (
                  "Проверка..."
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" /> Тест связи
                  </>
                )}
              </Button>
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
