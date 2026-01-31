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
  ListTree,
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

// Типы драйверов для TypeScript
type FiscalDriver = "hdm_iiko" | "custom" | "hdm" | "atol" | "shtrih" | "evotor";

interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: FiscalDriver;
  api_url: string;
  api_login: string; // Будет использоваться как CashierId
  api_password: string; // Будет использоваться как CashierPin
  kkm_password: string; // KkmPassword
  vat_rate: number;
  default_adg: string;
  use_default_adg: boolean;
  subcharge_name: string;
  subcharge_code: string;
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
    try {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      setLocations(data || []);
      if (data && data.length > 0) setSelectedLocation(data[0].id);
    } catch (error) {
      toast.error("Ошибка загрузки точек");
    } finally {
      setLoading(false);
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
        setConfig({
          ...defaultConfig,
          ...data,
          driver: (data.driver as FiscalDriver) || "hdm_iiko",
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

  // Функция отправки тестового чека напрямую на iiko плагин
  const handleTestPrint = async () => {
    if (!config.api_url) return toast.error("Укажите адрес хоста");

    setTesting(true);
    toast.info("Отправка тестового чека на ККМ...");

    const testOrder = {
      CashierId: config.api_login,
      CashierPin: config.api_password,
      KkmPassword: config.kkm_password,
      OperationType: "Sale",
      Items: [
        {
          Name: "Тестовая позиция",
          Price: 100,
          Quantity: 1,
          TaxPercent: config.vat_rate,
          AdgCode: config.default_adg,
        },
      ],
      Payments: [
        {
          Amount: 100,
          PaymentType: "Cash",
        },
      ],
      UseDefaultAdg: config.use_default_adg,
    };

    try {
      // Пытаемся отправить запрос на локальный IP.
      // Важно: плагин на кассе должен поддерживать CORS.
      const response = await fetch(`${config.api_url}/print_receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testOrder),
      });

      if (response.ok) {
        toast.success("Чек успешно напечатан!");
      } else {
        throw new Error("Касса отклонила запрос");
      }
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(`Ошибка: ${error.message}. Проверьте соединение с ${config.api_url}`);
    } finally {
      setTesting(false);
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
      <PageHeader title="Интеграция iiko KKM" description="Параметры связи с фискальным регистратором (HDM Armenia)" />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Label className="font-bold text-lg">Рабочая точка:</Label>
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
                <ShieldCheck className="h-4 w-4" /> Модуль активен
              </span>
            ) : (
              <span className="text-muted-foreground bg-gray-100 px-3 py-1 rounded-full border">Модуль отключен</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Блок Сети */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" /> Сеть и Авторизация
            </CardTitle>
            <CardDescription>Настройки из XML-конфигурации iiko</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Адрес плагина (Host:Port)</Label>
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

        {/* Блок Налогов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ListTree className="h-5 w-5" /> Коды и Налоги (ADG)
            </CardTitle>
            <CardDescription>Специфические параметры для Армении</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>НДС % (VatRate)</Label>
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
                <p className="text-xs text-muted-foreground">Всегда использовать ADG по умолчанию</p>
              </div>
              <Switch
                checked={config.use_default_adg}
                onCheckedChange={(v) => setConfig({ ...config, use_default_adg: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Услуга (Subcharge Name)</Label>
              <Input
                value={config.subcharge_name}
                onChange={(e) => setConfig({ ...config, subcharge_name: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Настройки работы */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Операционные настройки</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Разрешить скидки</Label>
                <Switch
                  checked={config.use_discount}
                  onCheckedChange={(v) => setConfig({ ...config, use_discount: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Кухонные названия</Label>
                <Switch
                  checked={config.use_kitchen_name}
                  onCheckedChange={(v) => setConfig({ ...config, use_kitchen_name: v })}
                />
              </div>
              <div className="flex items-center justify-between text-primary font-bold">
                <Label>Включить фискализацию</Label>
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Таймаут ККМ (мс)</Label>
                <Input
                  type="number"
                  value={config.payment_timeout}
                  onChange={(e) => setConfig({ ...config, payment_timeout: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Авто-печать</Label>
                <Switch
                  checked={config.auto_print_receipt}
                  onCheckedChange={(v) => setConfig({ ...config, auto_print_receipt: v })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-end">
              <Button variant="outline" onClick={handleTestPrint} disabled={testing}>
                {testing ? (
                  "Печать..."
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" /> Пробный чек
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

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-bold">Внимание</AlertTitle>
        <AlertDescription className="text-amber-700">
          Печать чеков происходит напрямую с устройства кассира на локальный IP адрес кассы. Убедитесь, что компьютер
          кассира находится в той же сети, что и ККМ ({config.api_url}).
        </AlertDescription>
      </Alert>
    </div>
  );
}
