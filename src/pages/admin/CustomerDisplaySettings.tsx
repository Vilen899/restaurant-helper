import { useState, useEffect } from 'react';
import { Upload, Image, Video, Trash2, Monitor, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DisplaySettings {
  backgroundUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

const STORAGE_KEY = 'customer_display_settings';

export default function CustomerDisplaySettingsPage() {
  const [settings, setSettings] = useState<DisplaySettings>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: DisplaySettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    
    // Broadcast to customer display
    const channel = new BroadcastChannel('customer_display');
    channel.postMessage({ type: 'settings_update', data: newSettings });
    channel.close();
    
    toast.success('Настройки сохранены');
  };

  const handleFileUpload = async (file: File, type: 'background' | 'media') => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast.error('Поддерживаются только изображения и видео');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `customer-display/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      if (type === 'background') {
        saveSettings({ ...settings, backgroundUrl: publicUrl });
      } else {
        saveSettings({ 
          ...settings, 
          mediaUrl: publicUrl, 
          mediaType: isVideo ? 'video' : 'image' 
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (type: 'background' | 'media') => {
    if (type === 'background') {
      saveSettings({ ...settings, backgroundUrl: undefined });
    } else {
      saveSettings({ ...settings, mediaUrl: undefined, mediaType: undefined });
    }
  };

  const openCustomerDisplay = () => {
    window.open('/customer-display', 'customer_display', 'width=1200,height=800');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Экран покупателя</h1>
          <p className="text-muted-foreground">Настройка отображения для клиентов</p>
        </div>
        <Button onClick={openCustomerDisplay} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Открыть экран
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Background */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Фон экрана
            </CardTitle>
            <CardDescription>
              Загрузите изображение для фона экрана покупателя
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.backgroundUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <img
                  src={settings.backgroundUrl}
                  alt="Background"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeMedia('background')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Нет изображения</p>
              </div>
            )}
            <div>
              <Label htmlFor="background-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? 'Загрузка...' : 'Загрузить фон'}</span>
                </div>
                <Input
                  id="background-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'background');
                  }}
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Media (Photo/Video) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Медиа контент
            </CardTitle>
            <CardDescription>
              Загрузите фото или видео для левой части экрана
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.mediaUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                {settings.mediaType === 'video' ? (
                  <video
                    src={settings.mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                  />
                ) : (
                  <img
                    src={settings.mediaUrl}
                    alt="Media"
                    className="w-full h-full object-cover"
                  />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeMedia('media')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Нет медиа</p>
              </div>
            )}
            <div>
              <Label htmlFor="media-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? 'Загрузка...' : 'Загрузить фото/видео'}</span>
                </div>
                <Input
                  id="media-upload"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'media');
                  }}
                />
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Предпросмотр
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="aspect-video rounded-lg overflow-hidden border flex"
            style={{
              backgroundImage: settings.backgroundUrl ? `url(${settings.backgroundUrl})` : undefined,
              backgroundSize: 'cover',
            }}
          >
            <div className="flex-1 flex items-center justify-center bg-black/30">
              {settings.mediaUrl ? (
                settings.mediaType === 'video' ? (
                  <video src={settings.mediaUrl} className="max-h-48 rounded" autoPlay loop muted />
                ) : (
                  <img src={settings.mediaUrl} alt="Preview" className="max-h-48 rounded" />
                )
              ) : (
                <p className="text-white/50">Медиа контент</p>
              )}
            </div>
            <div className="w-1/3 bg-background/90 p-4 flex flex-col">
              <p className="font-bold text-center mb-2">Ваш заказ</p>
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Позиции заказа
              </div>
              <div className="border-t pt-2 text-center font-bold">
                Итого: 0 ֏
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
