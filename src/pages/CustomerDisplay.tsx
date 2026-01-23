import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id?: string;
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
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const prevCartRef = useRef<CartItem[]>([]);

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
        const newItems = data.items || [];
        
        // Find newly added item
        if (newItems.length > prevCartRef.current.length) {
          const newItem = newItems[newItems.length - 1];
          setLastAddedId(newItem?.id || `item-${newItems.length - 1}`);
          setTimeout(() => setLastAddedId(null), 500);
        }
        
        prevCartRef.current = newItems;
        setCart(newItems);
        setSubtotal(data.subtotal || 0);
        setDiscount(data.discount || 0);
        setTotal(data.total || 0);
      } else if (type === 'settings_update') {
        setSettings(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else if (type === 'clear') {
        prevCartRef.current = [];
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
      className="min-h-screen flex overflow-hidden"
      style={{
        backgroundImage: settings.backgroundUrl ? `url(${settings.backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Left side - Media */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8 bg-black/30"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {settings.mediaUrl ? (
          settings.mediaType === 'video' ? (
            <motion.video
              src={settings.mediaUrl}
              autoPlay
              loop
              muted
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          ) : (
            <motion.img
              src={settings.mediaUrl}
              alt="Promo"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          )
        ) : (
          <motion.div 
            className="text-white/50 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-3xl font-light">Добро пожаловать!</p>
            <p className="text-xl mt-3">Ваш заказ появится справа</p>
          </motion.div>
        )}
      </motion.div>

      {/* Right side - Cart */}
      <motion.div 
        className="w-[420px] bg-background/95 backdrop-blur-lg flex flex-col shadow-2xl"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div 
          className="p-6 border-b bg-gradient-to-r from-primary/10 to-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-center">Ваш заказ</h1>
        </motion.div>

        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div 
                className="h-full flex items-center justify-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-lg">Корзина пуста</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => {
                  const itemId = item.id || `item-${index}`;
                  const isNew = lastAddedId === itemId;
                  
                  return (
                    <motion.div
                      key={itemId}
                      layout
                      initial={{ opacity: 0, x: 50, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0, 
                        scale: isNew ? [1, 1.03, 1] : 1,
                        backgroundColor: isNew ? ['hsl(var(--primary) / 0.2)', 'hsl(var(--muted) / 0.5)'] : undefined
                      }}
                      exit={{ opacity: 0, x: -50, scale: 0.8 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        mass: 1
                      }}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-lg">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {item.price.toLocaleString()} ֏
                        </p>
                      </div>
                      <motion.p 
                        className="font-bold text-xl"
                        key={`${itemId}-${item.quantity}`}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {(item.quantity * item.price).toLocaleString()} ֏
                      </motion.p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Totals */}
        <motion.div 
          className="p-6 border-t space-y-3 bg-gradient-to-t from-muted/50 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {cart.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-muted-foreground">
                  <span>Подытог:</span>
                  <motion.span
                    key={subtotal}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                  >
                    {subtotal.toLocaleString()} ֏
                  </motion.span>
                </div>
                <AnimatePresence>
                  {discount > 0 && (
                    <motion.div 
                      className="flex justify-between text-green-600"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <span>Скидка:</span>
                      <span>-{discount.toLocaleString()} ֏</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div 
            className="flex justify-between text-3xl font-bold pt-2 border-t"
            layout
          >
            <span>Итого:</span>
            <motion.span
              key={total}
              initial={{ scale: 1.15, color: 'hsl(var(--primary))' }}
              animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {total.toLocaleString()} ֏
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
