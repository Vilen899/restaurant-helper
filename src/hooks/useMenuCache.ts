import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<"menu_items">;
type MenuCategory = Tables<"menu_categories">;
type PaymentMethod = Tables<"payment_methods">;

interface MenuCache {
  menuItems: MenuItem[];
  categories: MenuCategory[];
  paymentMethods: PaymentMethod[];
  timestamp: number;
}

const CACHE_KEY = 'cashier_menu_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useMenuCache() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const loadFromCache = useCallback((): MenuCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as MenuCache;
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp < CACHE_DURATION) {
        return data;
      }
      
      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const saveToCache = useCallback((data: Omit<MenuCache, 'timestamp'>) => {
    try {
      const cache: MenuCache = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache menu data:', error);
    }
  }, []);

  const fetchFromNetwork = useCallback(async () => {
    const [{ data: items }, { data: cats }, { data: payments }] = await Promise.all([
      supabase.from("menu_items").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("menu_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
    ]);

    const result = {
      menuItems: items || [],
      categories: cats || [],
      paymentMethods: payments || [],
    };

    // Cache the fresh data
    saveToCache(result);

    return result;
  }, [saveToCache]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    
    try {
      // Try cache first for instant UI
      const cached = loadFromCache();
      if (cached) {
        setMenuItems(cached.menuItems);
        setCategories(cached.categories);
        setPaymentMethods(cached.paymentMethods);
        setFromCache(true);
        setLoading(false);
        
        // Fetch fresh data in background
        fetchFromNetwork().then(fresh => {
          setMenuItems(fresh.menuItems);
          setCategories(fresh.categories);
          setPaymentMethods(fresh.paymentMethods);
          setFromCache(false);
        }).catch(console.error);
        
        return;
      }
      
      // No cache, fetch from network
      const data = await fetchFromNetwork();
      setMenuItems(data.menuItems);
      setCategories(data.categories);
      setPaymentMethods(data.paymentMethods);
      setFromCache(false);
    } catch (error) {
      console.error('Failed to load menu:', error);
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, fetchFromNetwork]);

  const refreshMenu = useCallback(async () => {
    try {
      const data = await fetchFromNetwork();
      setMenuItems(data.menuItems);
      setCategories(data.categories);
      setPaymentMethods(data.paymentMethods);
      setFromCache(false);
    } catch (error) {
      console.error('Failed to refresh menu:', error);
    }
  }, [fetchFromNetwork]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  return {
    menuItems,
    categories,
    paymentMethods,
    loading,
    fromCache,
    refreshMenu,
    clearCache,
  };
}
