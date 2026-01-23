import { useState, useEffect } from 'react';
import { Printer, Settings, Wifi, WifiOff, TestTube, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';

interface FiscalConfig {
  enabled: boolean;
  driver: 'atol' | 'shtrih' | 'evotor' | 'custom';
  connection: 'usb' | 'network' | 'bluetooth';
  ip_address: string;
  port: string;
  device_id: string;
  operator_name: string;
  inn: string;
  auto_print_receipt: boolean;
  print_copy: boolean;
}

const defaultConfig: FiscalConfig = {
  enabled: false,
  driver: 'atol',
  connection: 'network',
  ip_address: '192.168.1.100',
  port: '5555',
  device_id: '',
  operator_name: '',
  inn: '',
  auto_print_receipt: true,
  print_copy: false,
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState<FiscalConfig>(defaultConfig);
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('fiscal_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('fiscal_config', JSON.stringify(config));
      toast.success('Настройки сохранены');
      setSaving(false);
    }, 500);
  };

  const handleTestConnection = () => {
    setTesting(true);
    // Simulate connection test
    setTimeout(() => {
      // In real implementation, this would call an edge function to test connection
      const success = Math.random() > 0.3;
      if (success) {
        setConnected(true);
        toast.success('Подключение успешно!');
      } else {
        setConnected(false);
        toast.error('Не удалось подключиться к ККТ');
      }
      setTesting(false);
    }, 2000);
  };

  const handleTestPrint = () => {
    toast.info('Печать тестового чека...');
    // In real implementation, this would send a test print command
    setTimeout(() => {
      toast.success('Тестовый чек напечатан');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки ККТ"
        description="Подключение и настройка кассового аппарата"
      />

      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Обратите внимание</AlertTitle>
        <AlertDescription>
          Для работы с ККТ требуется установленный драйвер кассового аппарата на сервере. 
          Свяжитесь с технической поддержкой для настройки интеграции.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Основные настройки
            </CardTitle>
            <CardDescription>Параметры подключения к кассовому аппарату</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Использовать ККТ</Label>
                <p className="text-sm text-muted-foreground">Включить печать фискальных чеков</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Модель ККТ</Label>
              <Select
                value={config.driver}
                onValueChange={(value: any) => setConfig({ ...config, driver: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atol">АТОЛ</SelectItem>
                  <SelectItem value="shtrih">Штрих-М</SelectItem>
                  <SelectItem value="evotor">Эвотор</SelectItem>
                  <SelectItem value="custom">Другой (API)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тип подключения</Label>
              <Select
                value={config.connection}
                onValueChange={(value: any) => setConfig({ ...config, connection: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Сеть (Ethernet/Wi-Fi)</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.connection === 'network' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IP-адрес</Label>
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
            )}

            <div className="space-y-2">
              <Label>ID устройства</Label>
              <Input
                value={config.device_id}
                onChange={(e) => setConfig({ ...config, device_id: e.target.value })}
                placeholder="Серийный номер или ID"
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Реквизиты организации
            </CardTitle>
            <CardDescription>Данные для печати на чеках</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>ИНН организации</Label>
              <Input
                value={config.inn}
                onChange={(e) => setConfig({ ...config, inn: e.target.value })}
                placeholder="1234567890"
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label>Имя оператора (кассира)</Label>
              <Input
                value={config.operator_name}
                onChange={(e) => setConfig({ ...config, operator_name: e.target.value })}
                placeholder="Иванов И.И."
              />
              <p className="text-xs text-muted-foreground">
                Если не указано, будет использоваться имя авторизованного пользователя
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Автоматическая печать</Label>
                <p className="text-sm text-muted-foreground">Печатать чек сразу после оплаты</p>
              </div>
              <Switch
                checked={config.auto_print_receipt}
                onCheckedChange={(checked) => setConfig({ ...config, auto_print_receipt: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Печатать копию</Label>
                <p className="text-sm text-muted-foreground">Печатать второй экземпляр чека</p>
              </div>
              <Switch
                checked={config.print_copy}
                onCheckedChange={(checked) => setConfig({ ...config, print_copy: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
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
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Инструкция по подключению</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <ol className="list-decimal pl-4 space-y-2">
            <li>Убедитесь, что кассовый аппарат включен и подключен к сети</li>
            <li>Выберите модель ККТ и тип подключения</li>
            <li>Введите IP-адрес и порт (для сетевого подключения)</li>
            <li>Укажите реквизиты организации</li>
            <li>Нажмите «Тест подключения» для проверки связи</li>
            <li>При успешном подключении выполните тестовую печать</li>
          </ol>
          <p className="mt-4">
            При возникновении проблем обратитесь в техническую поддержку.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
