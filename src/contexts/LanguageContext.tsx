import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ru' | 'hy' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Common
    'common.loading': 'Загрузка...',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.add': 'Добавить',
    'common.search': 'Поиск',
    'common.back': 'Назад',
    'common.close': 'Закрыть',
    'common.confirm': 'Подтвердить',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.error': 'Ошибка',
    'common.success': 'Успешно',
    'common.items': 'позиций',
    
    // Auth
    'auth.login': 'Войти',
    'auth.logout': 'Выйти',
    'auth.enterPin': 'Введите PIN-код',
    'auth.selectLocation': 'Выберите точку',
    'auth.pinRequired': 'Войдите по PIN-коду',
    'auth.cashierOnly': 'Доступ только для кассиров',
    'auth.verifying': 'Проверка...',
    'auth.wrongPin': 'Неверный PIN-код',
    'auth.unlock': 'Разблокировать',
    
    // Cashier
    'cashier.title': 'Кассир',
    'cashier.shift': 'Смена',
    'cashier.shiftOpened': 'Смена открыта',
    'cashier.shiftClosed': 'Смена закрыта',
    'cashier.closeShift': 'Закрыть смену',
    'cashier.lock': 'Блокировка',
    'cashier.refund': 'Возврат',
    'cashier.currentOrder': 'Текущий заказ',
    'cashier.total': 'Итого',
    'cashier.pay': 'Оплата',
    'cashier.clearCart': 'Очистить',
    'cashier.added': 'добавлен',
    'cashier.receipt': 'Чек',
    'cashier.orderError': 'Ошибка оформления заказа',
    'cashier.menuError': 'Ошибка загрузки меню',
    'cashier.existingShift': 'Восстановлена открытая смена',
    
    // Payment
    'payment.title': 'Способ оплаты',
    'payment.cash': 'Наличные',
    'payment.card': 'Картой',
    'payment.received': 'Получено',
    'payment.change': 'Сдача',
    'payment.notEnough': 'Недостаточно средств',
    
    // Z-Report
    'zreport.title': 'Z-Отчёт',
    'zreport.totalOrders': 'Всего заказов',
    'zreport.totalRevenue': 'Общая выручка',
    'zreport.byPaymentMethod': 'По способам оплаты',
    'zreport.confirmClose': 'Вы уверены, что хотите закрыть смену?',
    
    // Admin
    'admin.dashboard': 'Дашборд',
    'admin.menu': 'Меню',
    'admin.categories': 'Категории',
    'admin.recipes': 'Рецепты',
    'admin.semiFinished': 'Полуфабрикаты',
    'admin.ingredients': 'Ингредиенты',
    'admin.inventory': 'Склад',
    'admin.inventoryReport': 'Отчёт по складу',
    'admin.staff': 'Персонал',
    'admin.workTime': 'Рабочее время',
    'admin.locations': 'Точки',
    'admin.paymentMethods': 'Способы оплаты',
    'admin.documents': 'Документы',
    'admin.reports': 'Отчёты',
    'admin.fiscalSettings': 'Фискальные настройки',
    'admin.settings': 'Настройки',
    
    // Language
    'language.title': 'Язык',
    'language.ru': 'Русский',
    'language.hy': 'Հայdelays',
    'language.en': 'English',
  },
  
  hy: {
    // Common
    'common.loading': 'Բdelays...',
    'common.save': 'Պdelays',
    'common.cancel': 'Չdelays',
    'common.delete': ' Delays',
    'common.edit': 'Խdelays',
    'common.add': 'Աdelays',
    'common.search': 'Որdelays',
    'common.back': 'Delays',
    'common.close': 'Փdelays',
    'common.confirm': 'Delays',
    'common.yes': 'Աdelays',
    'common.no': ' Delays',
    'common.error': 'Սdelays',
    'common.success': 'Delays',
    'common.items': 'delays',
    
    // Auth
    'auth.login': 'Delays',
    'auth.logout': 'Delays',
    'auth.enterPin': 'Delays PIN-delays',
    'auth.selectLocation': 'Delays delays',
    'auth.pinRequired': 'Delays PIN delays',
    'auth.cashierOnly': 'Delays delays',
    'auth.verifying': 'Delays...',
    'auth.wrongPin': 'Delays PIN',
    'auth.unlock': 'Delays',
    
    // Cashier
    'cashier.title': 'Delays',
    'cashier.shift': 'Delays',
    'cashier.shiftOpened': 'Delays delays',
    'cashier.shiftClosed': 'Delays delays',
    'cashier.closeShift': 'Delays delays',
    'cashier.lock': 'Delays',
    'cashier.refund': 'Delays',
    'cashier.currentOrder': 'Delays delays',
    'cashier.total': 'Delays',
    'cashier.pay': 'Delays',
    'cashier.clearCart': 'Delays',
    'cashier.added': 'delays',
    'cashier.receipt': 'Delays',
    'cashier.orderError': 'Delays delays',
    'cashier.menuError': 'Delays delays',
    'cashier.existingShift': 'Delays delays',
    
    // Payment
    'payment.title': 'Delays delays',
    'payment.cash': 'Delays',
    'payment.card': 'Delays',
    'payment.received': 'Delays',
    'payment.change': 'Delays',
    'payment.notEnough': 'Delays delays',
    
    // Z-Report
    'zreport.title': 'Z delays',
    'zreport.totalOrders': 'Delays delays',
    'zreport.totalRevenue': 'Delays delays',
    'zreport.byPaymentMethod': 'Delays delays',
    'zreport.confirmClose': 'Delays delays?',
    
    // Admin
    'admin.dashboard': 'Delays',
    'admin.menu': 'Delays',
    'admin.categories': 'Delays',
    'admin.recipes': 'Delays',
    'admin.semiFinished': 'Delays',
    'admin.ingredients': 'Delays',
    'admin.inventory': 'Delays',
    'admin.inventoryReport': 'Delays delays',
    'admin.staff': 'Delays',
    'admin.workTime': 'Delays delays',
    'admin.locations': 'Delays',
    'admin.paymentMethods': 'Delays delays',
    'admin.documents': 'Delays',
    'admin.reports': 'Delays',
    'admin.fiscalSettings': 'Delays delays',
    'admin.settings': 'Delays',
    
    // Language
    'language.title': 'Delays',
    'language.ru': 'Delays',
    'language.hy': 'Հdelays',
    'language.en': 'Delays',
  },
  
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.back': 'Back',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.items': 'items',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.enterPin': 'Enter PIN',
    'auth.selectLocation': 'Select location',
    'auth.pinRequired': 'Please enter PIN',
    'auth.cashierOnly': 'Cashiers only',
    'auth.verifying': 'Verifying...',
    'auth.wrongPin': 'Wrong PIN',
    'auth.unlock': 'Unlock',
    
    // Cashier
    'cashier.title': 'Cashier',
    'cashier.shift': 'Shift',
    'cashier.shiftOpened': 'Shift opened',
    'cashier.shiftClosed': 'Shift closed',
    'cashier.closeShift': 'Close shift',
    'cashier.lock': 'Lock',
    'cashier.refund': 'Refund',
    'cashier.currentOrder': 'Current order',
    'cashier.total': 'Total',
    'cashier.pay': 'Pay',
    'cashier.clearCart': 'Clear',
    'cashier.added': 'added',
    'cashier.receipt': 'Receipt',
    'cashier.orderError': 'Order error',
    'cashier.menuError': 'Menu loading error',
    'cashier.existingShift': 'Restored open shift',
    
    // Payment
    'payment.title': 'Payment method',
    'payment.cash': 'Cash',
    'payment.card': 'Card',
    'payment.received': 'Received',
    'payment.change': 'Change',
    'payment.notEnough': 'Not enough',
    
    // Z-Report
    'zreport.title': 'Z-Report',
    'zreport.totalOrders': 'Total orders',
    'zreport.totalRevenue': 'Total revenue',
    'zreport.byPaymentMethod': 'By payment method',
    'zreport.confirmClose': 'Are you sure you want to close the shift?',
    
    // Admin
    'admin.dashboard': 'Dashboard',
    'admin.menu': 'Menu',
    'admin.categories': 'Categories',
    'admin.recipes': 'Recipes',
    'admin.semiFinished': 'Semi-finished',
    'admin.ingredients': 'Ingredients',
    'admin.inventory': 'Inventory',
    'admin.inventoryReport': 'Inventory report',
    'admin.staff': 'Staff',
    'admin.workTime': 'Work time',
    'admin.locations': 'Locations',
    'admin.paymentMethods': 'Payment methods',
    'admin.documents': 'Documents',
    'admin.reports': 'Reports',
    'admin.fiscalSettings': 'Fiscal settings',
    'admin.settings': 'Settings',
    
    // Language
    'language.title': 'Language',
    'language.ru': 'Русский',
    'language.hy': 'Հdelays',
    'language.en': 'English',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
