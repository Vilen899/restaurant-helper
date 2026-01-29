
# План: Расширенное управление данными и отчётность

## Обзор изменений

1. **Скрыть "Центральный" из выбора в кассе** — точка "Crusty Центральный" не будет отображаться в выпадающем списке на странице PIN-логина (только в админке)

2. **Добавить удаление везде в админке** — возможность удаления:
   - Поставок
   - Перемещений  
   - Инвентаризаций
   - Заказов/продаж
   - Остатков на складе

3. **Просмотр содержимого чека** — функционал уже реализован в Documents.tsx, можно нажать на иконку "глаз" и увидеть все позиции чека

4. **Отчёт движения товаров** — новая страница для просмотра всех операций с товарами (поставки, продажи, перемещения, корректировки)

---

## 1. Скрытие "Центральный" из выбора точки в кассе

**Файл:** `src/pages/PinLogin.tsx`

**Изменения:**
Фильтровать точки, исключая те, которые содержат слово "Центральный" или "центральный":

```typescript
// В useEffect при загрузке локаций (строка 81):
const { data } = await supabase
  .from("locations")
  .select("id, name")
  .eq("is_active", true);

if (data?.length) {
  // Фильтруем — исключаем "Центральный"
  const filtered = data.filter(loc => 
    !loc.name.toLowerCase().includes('центральный')
  );
  setLocations(filtered);
  if (filtered.length > 0) {
    setSelectedLocation(filtered[0].id);
  }
}
```

---

## 2. Добавление удаления в админке

### 2.1 Миграция БД — политики удаления

Добавить RLS политики для удаления данных администраторами:

```sql
-- Удаление поставок
CREATE POLICY "Admins can delete supplies"
ON public.supplies FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление позиций поставок
CREATE POLICY "Admins can delete supply_items"
ON public.supply_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление перемещений
CREATE POLICY "Admins can delete transfers"
ON public.transfers FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление позиций перемещений
CREATE POLICY "Admins can delete transfer_items"
ON public.transfer_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление инвентаризаций
CREATE POLICY "Admins can delete stocktakings"
ON public.stocktakings FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление позиций инвентаризаций
CREATE POLICY "Admins can delete stocktaking_items"
ON public.stocktaking_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление заказов
CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление позиций заказов
CREATE POLICY "Admins can delete order_items"
ON public.order_items FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление остатков
CREATE POLICY "Admins can delete inventory"
ON public.inventory FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Удаление движений
CREATE POLICY "Admins can delete inventory_movements"
ON public.inventory_movements FOR DELETE
USING (is_admin_or_manager(auth.uid()));
```

### 2.2 Обновление Inventory.tsx

**Добавить в каждую таблицу колонку "Действия" с кнопкой удаления:**

- Таблица остатков — кнопка удаления записи
- Таблица поставок — кнопка удаления (удалит и supply_items)
- Таблица перемещений — кнопка удаления (удалит и transfer_items)
- Таблица инвентаризаций — кнопка удаления (удалит и stocktaking_items)

**Функции удаления:**

```typescript
const handleDeleteSupply = async (id: string) => {
  if (!confirm('Удалить поставку? Это действие необратимо.')) return;
  await supabase.from('supply_items').delete().eq('supply_id', id);
  await supabase.from('supplies').delete().eq('id', id);
  toast.success('Поставка удалена');
  fetchData();
};

const handleDeleteTransfer = async (id: string) => {
  if (!confirm('Удалить перемещение?')) return;
  await supabase.from('transfer_items').delete().eq('transfer_id', id);
  await supabase.from('transfers').delete().eq('id', id);
  toast.success('Перемещение удалено');
  fetchData();
};

const handleDeleteStocktaking = async (id: string) => {
  if (!confirm('Удалить инвентаризацию?')) return;
  await supabase.from('stocktaking_items').delete().eq('stocktaking_id', id);
  await supabase.from('stocktakings').delete().eq('id', id);
  toast.success('Инвентаризация удалена');
  fetchData();
};

const handleDeleteInventory = async (id: string) => {
  if (!confirm('Удалить остаток?')) return;
  await supabase.from('inventory').delete().eq('id', id);
  toast.success('Запись удалена');
  fetchData();
};
```

### 2.3 Обновление Documents.tsx

**Добавить кнопки удаления в таблицу чеков:**

```typescript
const handleDeleteOrder = async (id: string) => {
  if (!confirm('Удалить заказ? Это действие необратимо.')) return;
  await supabase.from('order_items').delete().eq('order_id', id);
  await supabase.from('orders').delete().eq('id', id);
  toast.success('Заказ удалён');
  fetchDocuments();
};
```

---

## 3. Отчёт движения товаров

**Новый файл:** `src/pages/admin/InventoryMovements.tsx`

Страница для просмотра всех движений товаров:
- Фильтры: точка, период, тип операции (sale, supply, transfer_in, transfer_out, adjustment)
- Таблица со всеми записями inventory_movements
- Колонки: Дата, Ингредиент, Точка, Тип операции, Количество, Цена, Примечание

**Структура:**

```typescript
export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({
    location_id: 'all',
    movement_type: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const fetchMovements = async () => {
    let query = supabase
      .from('inventory_movements')
      .select('*, ingredient:ingredients(name, unit:units(*)), location:locations(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    // Применяем фильтры...
    
    const { data } = await query;
    setMovements(data || []);
  };

  // UI с таблицей и фильтрами
}
```

**Типы операций для отображения:**
- `sale` → "Продажа" (красный)
- `supply` → "Поставка" (зелёный)
- `transfer_in` → "Приход (перемещение)" (синий)
- `transfer_out` → "Расход (перемещение)" (оранжевый)
- `adjustment` → "Корректировка" (серый)
- `refund` → "Возврат" (фиолетовый)

### Добавление маршрута

**Файл:** `src/App.tsx`

```typescript
import InventoryMovementsPage from './pages/admin/InventoryMovements';

// В роутах админки:
<Route path="inventory-movements" element={<InventoryMovementsPage />} />
```

### Добавление в меню

**Файл:** `src/components/layout/AdminLayout.tsx`

Добавить ссылку в раздел "Отчёты":
- "Движение товаров" → `/admin/inventory-movements`

---

## Файлы для редактирования/создания

| Файл | Действие |
|------|----------|
| Миграция SQL | Создать политики удаления |
| `src/pages/PinLogin.tsx` | Фильтровать "Центральный" |
| `src/pages/admin/Inventory.tsx` | Добавить кнопки удаления |
| `src/pages/admin/Documents.tsx` | Добавить удаление заказов |
| `src/pages/admin/InventoryMovements.tsx` | Создать новую страницу |
| `src/App.tsx` | Добавить маршрут |
| `src/components/layout/AdminLayout.tsx` | Добавить пункт меню |

---

## Проверка после изменений

1. В кассе при выборе точки НЕ видно "Центральный"
2. В админке "Центральный" виден и доступен для выбора
3. Можно удалять поставки, перемещения, инвентаризации
4. Можно удалять заказы из раздела "Документы"
5. Можно удалять остатки со склада
6. Новая страница "Движение товаров" показывает все операции с фильтрами
7. Просмотр содержимого чека работает (иконка "глаз" в Documents)
