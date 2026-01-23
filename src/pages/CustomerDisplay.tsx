import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

interface DisplaySettings {
  backgroundUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

const STORAGE_KEY = 'customer_display_settings';

export default function CustomerDisplayPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [settings, setSettings] = useState<DisplaySettings>({});

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse display settings:', e);
      }
    }
  }, []);

  // Listen for cart updates via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('customer_display');
    
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'cart_update') {
        setCart(data.items || []);
        setSubtotal(data.subtotal || 0);
        setDiscount(data.discount || 0);
        setTotal(data.total || 0);
      } else if (type === 'settings_update') {
        setSettings(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else if (type === 'clear') {
        setCart([]);
        setSubtotal(0);
        setDiscount(0);
        setTotal(0);
      }
    };

    return () => channel.close();
  }, []);

  return (
    <div 
      className="min-h-screen flex"
      style={{
        backgroundImage: settings.backgroundUrl ? `url(${settings.backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Left side - Media */}
      <div className="flex-1 flex items-center justify-center p-8 bg-black/30">
        {settings.mediaUrl ? (
          settings.mediaType === 'video' ? (
            <video
              src={settings.mediaUrl}
              autoPlay
              loop
              muted
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
          ) : (
            <img
              src={settings.mediaUrl}
              alt="Promo"
              className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            />
          )
        ) : (
          <div className="text-white/50 text-center">
            <p className="text-2xl font-light">Добро пожаловать!</p>
            <p className="text-lg mt-2">Ваш заказ появится справа</p>
          </div>
        )}
      </div>

      {/* Right side - Cart */}
      <div className="w-96 bg-background/95 backdrop-blur flex flex-col shadow-2xl">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-center">Ваш заказ</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Корзина пуста</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {item.price.toLocaleString()} ֏
                    </p>
                  </div>
                  <p className="font-bold text-lg">
                    {(item.quantity * item.price).toLocaleString()} ֏
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="p-6 border-t space-y-3 bg-muted/30">
          {cart.length > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Подытог:</span>
                <span>{subtotal.toLocaleString()} ֏</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Скидка:</span>
                  <span>-{discount.toLocaleString()} ֏</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-3xl font-bold">
            <span>Итого:</span>
            <span>{total.toLocaleString()} ֏</span>
          </div>
        </div>
      </div>
    </div>
  );
}
