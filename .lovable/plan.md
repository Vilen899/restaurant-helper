
# План: Закрытие смены кассира из админки и блокировка входа в другую точку

## Обзор изменений
1. **Закрытие смены кассира из админ-панели** — добавить возможность администратору принудительно закрыть смену любого кассира
2. **Блокировка входа в другую точку** — если у кассира есть открытая смена в одной точке, он не сможет войти в другую, пока не закроет смену

---

## 1. Модификация verify-pin Edge Function

**Файл:** `supabase/functions/verify-pin/index.ts`

**Изменения:**
Добавить проверку открытой смены перед авторизацией:

```typescript
// После успешной проверки PIN, перед возвратом успеха:
// Проверяем, есть ли у пользователя открытая смена в ДРУГОЙ точке
const { data: openShift } = await supabaseClient
  .from('shifts')
  .select('id, location_id, locations(name)')
  .eq('user_id', profile.id)
  .is('ended_at', null)
  .maybeSingle();

if (openShift && openShift.location_id !== location_id) {
  return new Response(
    JSON.stringify({ 
      error: 'SHIFT_OPEN_AT_ANOTHER_LOCATION',
      message: `У вас открыта смена в точке "${openShift.locations?.name}". Закройте смену перед входом в другую точку.`
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## 2. Обновление PinLogin для обработки ошибки

**Файл:** `src/pages/PinLogin.tsx`

**Изменения:**
- Обработать новый тип ошибки `SHIFT_OPEN_AT_ANOTHER_LOCATION`
- Показать понятное сообщение пользователю с названием точки, где открыта смена

```typescript
// В handlePinSubmit:
if (data?.error === 'SHIFT_OPEN_AT_ANOTHER_LOCATION') {
  playErrorSound();
  toast.error(data.message);
  setPin('');
  return;
}
```

---

## 3. Добавление функции закрытия смены в админ-панель

**Файл:** `src/pages/admin/WorkTime.tsx`

**Изменения:**
- Добавить кнопку "Закрыть смену" рядом с каждой открытой сменой в таблице
- Создать диалог подтверждения закрытия с возможностью указать причину
- Реализовать функцию `closeShiftByAdmin`:

```typescript
const closeShiftByAdmin = async (shiftId: string) => {
  const { error } = await supabase
    .from('shifts')
    .update({ 
      ended_at: new Date().toISOString(),
      notes: 'Закрыто администратором'
    })
    .eq('id', shiftId);
  
  if (error) throw error;
  toast.success('Смена закрыта');
  fetchData();
};
```

**UI изменения:**
- Добавить колонку "Действия" в таблицу смен
- Для открытых смен показывать кнопку с иконкой `XCircle` и подсказкой "Закрыть смену"
- Добавить AlertDialog для подтверждения закрытия

---

## 4. Создание компонента CloseShiftAdminDialog

**Файл:** `src/components/admin/CloseShiftAdminDialog.tsx`

Новый компонент для закрытия смены:

```typescript
interface CloseShiftAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: {
    id: string;
    userName: string;
    locationName: string;
    startedAt: string;
  } | null;
  onConfirm: (shiftId: string) => Promise<void>;
}
```

Функционал:
- Показывает информацию о смене (кассир, точка, время начала, продолжительность)
- Поле для примечания (опционально)
- Кнопка "Закрыть смену"

---

## Техническая реализация

### Edge Function: verify-pin

```typescript
// После строки 69 (после успешной проверки PIN):

// Check if user has open shift at different location
const { data: openShift } = await supabaseClient
  .from('shifts')
  .select('id, location_id, started_at, location:locations(name)')
  .eq('user_id', profile.id)
  .is('ended_at', null)
  .maybeSingle();

if (openShift && openShift.location_id !== location_id) {
  return new Response(
    JSON.stringify({ 
      error: 'SHIFT_OPEN_AT_ANOTHER_LOCATION',
      location_name: openShift.location?.name,
      message: `Смена открыта в "${openShift.location?.name}". Закройте её перед входом.`
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### WorkTime.tsx — изменения в таблице

```tsx
// Добавить колонку действий
<TableHead className="w-20">Действия</TableHead>

// В строке для каждой смены:
<TableCell>
  {!shift.ended_at && (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={() => handleOpenCloseDialog(shift)}
      title="Закрыть смену"
    >
      <XCircle className="h-4 w-4 text-destructive" />
    </Button>
  )}
</TableCell>
```

---

## Файлы для редактирования

| Файл | Действие |
|------|----------|
| `supabase/functions/verify-pin/index.ts` | Добавить проверку открытой смены в другой точке |
| `src/pages/PinLogin.tsx` | Обработка ошибки SHIFT_OPEN_AT_ANOTHER_LOCATION |
| `src/pages/admin/WorkTime.tsx` | Добавить кнопку и диалог закрытия смены |
| `src/components/admin/CloseShiftAdminDialog.tsx` | Создать новый компонент |

---

## Проверка после изменений

1. ✅ Администратор может закрыть любую открытую смену из страницы "Учёт рабочего времени"
2. ✅ Кассир не может войти в точку B, если у него открыта смена в точке A
3. ✅ При попытке входа показывается сообщение с названием точки, где открыта смена
4. ✅ После закрытия смены администратором, кассир может войти в любую точку
