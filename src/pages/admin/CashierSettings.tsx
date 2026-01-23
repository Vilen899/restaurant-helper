import { useState, useEffect } from 'react';
import { Timer, Lock, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CashierSettings {
  autoLockEnabled: boolean;
  autoLockMinutes: number;
}

const STORAGE_KEY = 'cashier_settings';
const DEFAULT_SETTINGS: CashierSettings = {
  autoLockEnabled: true,
  autoLockMinutes: 5,
};

export default function CashierSettingsPage() {
  const [settings, setSettings] = useState<CashierSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error loading cashier settings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Broadcast to cashier app
    const channel = new BroadcastChannel('cashier_settings');
    channel.postMessage({ type: 'settings_update', data: settings });
    channel.close();
    
    setHasChanges(false);
    toast.success('Настройки сохранены');
  };

  const updateSetting = <K extends keyof CashierSettings>(key: K, value: CashierSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Настройки кассы</h1>
          <p className="text-muted-foreground">Параметры работы кассового приложения</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Сохранить
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Auto-lock settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Автоблокировка
            </CardTitle>
            <CardDescription>
              Автоматическая блокировка кассы при бездействии
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="autolock-enabled" className="flex-1">
                <div>Включить автоблокировку</div>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Касса заблокируется после периода бездействия
                </p>
              </Label>
              <Switch
                id="autolock-enabled"
                checked={settings.autoLockEnabled}
                onCheckedChange={(checked) => updateSetting('autoLockEnabled', checked)}
              />
            </div>

            {settings.autoLockEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    Время до блокировки
                  </Label>
                  <span className="text-lg font-bold">
                    {settings.autoLockMinutes} мин
                  </span>
                </div>
                <Slider
                  value={[settings.autoLockMinutes]}
                  onValueChange={([value]) => updateSetting('autoLockMinutes', value)}
                  min={1}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 мин</span>
                  <span>5 мин</span>
                  <span>10 мин</span>
                  <span>15 мин</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Справка
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Автоблокировка</strong> защищает кассу от 
              несанкционированного доступа, когда кассир отошёл от рабочего места.
            </p>
            <p>
              После блокировки кассир должен ввести свой PIN-код для продолжения работы.
            </p>
            <p>
              Рекомендуемое время: <strong className="text-foreground">5 минут</strong> для 
              баланса между безопасностью и удобством.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
