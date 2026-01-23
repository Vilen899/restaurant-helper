import { useState, useEffect } from 'react';
import { Printer, Settings, Wifi, WifiOff, TestTube, Save, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FiscalConfig {
  id?: string;
  location_id: string;
  enabled: boolean;
  driver: 'atol' | 'shtrih' | 'evotor' | 'custom';
  connection_type: 'network' | 'api';
  api_url: string;
  ip_address: string;
  port: string;
  api_login: string;
  api_password: string;
  api_token: string;
  device_id: string;
  serial_number: string;
  inn: string;
  operator_name: string;
  company_name: string;
  company_address: string;
  auto_print_receipt: boolean;
  print_copy: boolean;
}

const defaultConfig: FiscalConfig = {
  location_id: '',
  enabled: false,
  driver: 'custom',
  connection_type: 'api',
  api_url: '',
  ip_address: '',
  port: '5555',
  api_login: '',
  api_password: '',
  api_token: '',
  device_id: '',
  serial_number: '',
  inn: '',
  operator_name: '',
  company_name: '',
  company_address: '',
  auto_print_receipt: true,
  print_copy: false,
};

export default function FiscalSettingsPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<FiscalConfig>(defaultConfig);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

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
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
      
      if (data && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки точек');
    }
  };

  const fetchSettings = async (locationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiscal_settings')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          location_id: data.location_id,
          enabled: data.enabled,
          driver: data.driver as FiscalConfig['driver'],
          connection_type: data.connection_type as FiscalConfig['connection_type'],
          api_url: data.api_url || '',
          ip_address: data.ip_address || '',
          port: data.port || '5555',
          api_login: data.api_login || '',
          api_password: data.api_password || '',
          api_token: data.api_token || '',
          device_id: data.device_id || '',
          serial_number: data.serial_number || '',
          inn: data.inn || '',
          operator_name: data.operator_name || '',
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          auto_print_receipt: data.auto_print_receipt,
          print_copy: data.print_copy,
        });
      } else {
        setConfig({ ...defaultConfig, location_id: locationId });
      }
      setConnected(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation) {
      toast.error('Выберите точку');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        location_id: selectedLocation,
        enabled: config.enabled,
        driver: config.driver,
        connection_type: config.connection_type,
        api_url: config.api_url || null,
        ip_address: config.ip_address || null,
        port: config.port || null,
        api_login: config.api_login || null,
        api_password: config.api_password || null,
        api_token: config.api_token || null,
        device_id: config.device_id || null,
        serial_number: config.serial_number || null,
        inn: config.inn || null,
        operator_name: config.operator_name || null,
        company_name: config.company_name || null,
        company_address: config.company_address || null,
        auto_print_receipt: config.auto_print_receipt,
        print_copy: config.print_copy,
      };

      if (config.id) {
        const { error } = await supabase
          .from('fiscal_settings')
          .update(dataToSave)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fiscal_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Настройки сохранены');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.api_url && !config.ip_address) {
      toast.error('Укажите API URL или IP-адрес');
      return;
    }

    setTesting(true);
    setConnected(false);

    try {
      const { data, error } = await supabase.functions.invoke('fiscal-print', {
        body: {
          action: 'test_connection',
          location_id: selectedLocation,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setConnected(true);
        toast.success(data.message || 'Подключение успешно!');
      } else {
        toast.error(data?.error || data?.message || 'Не удалось подключиться');
      }
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(error.message || 'Ошибка тестирования подключения');
    } finally {
      setTesting(false);
    }
  };

  const handleTestPrint = async () => {
    toast.info('Печать тестового чека...');

    try {
      const { data, error } = await supabase.functions.invoke('fiscal-print', {
        body: {
          action: 'print_receipt',
          location_id: selectedLocation,
          order_data: {
            order_number: 999,
            items: [
              { name: 'Тестовая позиция 1', quantity: 2, price: 100, total: 200 },
              { name: 'Тестовая позиция 2', quantity: 1, price: 150, total: 150 },
            ],
            subtotal: 350,
            discount: 0,
            total: 350,
            payment_method: 'cash',
            cashier_name: 'Тест',
            date: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Тестовый чек отправлен на печать');
      } else {
        toast.error(data?.error || 'Ошибка печати');
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.message || 'Ошибка печати тестового чека');
    }
  };

  const getLocationName = () => {
    return locations.find(l => l.id === selectedLocation)?.name || '';
  };

  if (loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки ККТ"
        description="Подключение кассового аппарата к точке продаж"
      />

      {/* Location selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap">Точка:</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Выберите точку" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Универсальная интеграция</AlertTitle>
        <AlertDescription>
          Укажите API URL вашего кассового аппарата (например, как в Dines), логин и пароль для авторизации.
          Система поддерживает АТОЛ, Штрих-М, Эвотор и произвольные API.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Подключение
            </CardTitle>
            <CardDescription>Параметры подключения к ККТ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Использовать ККТ</Label>
                <p className="text-sm text-muted-foreground">Включить фискализацию для точки {getLocationName()}</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Тип ККТ / Драйвер</Label>
              <Select
                value={config.driver}
                onValueChange={(value: FiscalConfig['driver']) => setConfig({ ...config, driver: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Произвольный API (универсальный)</SelectItem>
                  <SelectItem value="atol">АТОЛ</SelectItem>
                  <SelectItem value="shtrih">Штрих-М</SelectItem>
                  <SelectItem value="evotor">Эвотор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API URL *</Label>
              <Input
                value={config.api_url}
                onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                placeholder="https://api.your-fiscal.com или http://192.168.1.100:5555"
              />
              <p className="text-xs text-muted-foreground">
                Полный URL к API кассового аппарата
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IP-адрес (альтернатива)</Label>
                <Input
                  value={config.ip_address}
                  onChange={(e) => setConfig({ ...config, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>Порт</Label>
                <Input
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                  placeholder="5555"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID устройства / Серийный номер</Label>
              <Input
                value={config.device_id}
                onChange={(e) => setConfig({ ...config, device_id: e.target.value })}
                placeholder="Серийный номер ККТ"
              />
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Авторизация
            </CardTitle>
            <CardDescription>Данные для подключения к API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Логин</Label>
              <Input
                value={config.api_login}
                onChange={(e) => setConfig({ ...config, api_login: e.target.value })}
                placeholder="Логин от API"
              />
            </div>

            <div className="space-y-2">
              <Label>Пароль</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={config.api_password}
                  onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                  placeholder="Пароль от API"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Токен (альтернатива)</Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={config.api_token}
                  onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                  placeholder="Bearer токен (если используется)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Используйте либо логин/пароль, либо токен
              </p>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h4 className="font-medium">Реквизиты организации</h4>
              
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input
                  value={config.inn}
                  onChange={(e) => setConfig({ ...config, inn: e.target.value })}
                  placeholder="1234567890"
                  maxLength={12}
                />
              </div>

              <div className="space-y-2">
                <Label>Название организации</Label>
                <Input
                  value={config.company_name}
                  onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                  placeholder="ООО Ресторан"
                />
              </div>

              <div className="space-y-2">
                <Label>Имя оператора (кассира)</Label>
                <Input
                  value={config.operator_name}
                  onChange={(e) => setConfig({ ...config, operator_name: e.target.value })}
                  placeholder="Иванов И.И."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки печати</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Автоматическая печать</Label>
                <p className="text-sm text-muted-foreground">Печатать чек сразу после оплаты</p>
              </div>
              <Switch
                checked={config.auto_print_receipt}
                onCheckedChange={(checked) => setConfig({ ...config, auto_print_receipt: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Печатать копию</Label>
                <p className="text-sm text-muted-foreground">Второй экземпляр для клиента</p>
              </div>
              <Switch
                checked={config.print_copy}
                onCheckedChange={(checked) => setConfig({ ...config, print_copy: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status & Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {connected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="h-5 w-5" />
                  <span className="font-medium">ККТ подключена</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <WifiOff className="h-5 w-5" />
                  <span>ККТ не подключена</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !config.id}
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Тест подключения
                  </>
                )}
              </Button>

              {connected && (
                <Button variant="outline" onClick={handleTestPrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Тестовый чек
                </Button>
              )}

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </div>
          {!config.id && (
            <p className="text-sm text-muted-foreground mt-2">
              Сохраните настройки перед тестированием подключения
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
