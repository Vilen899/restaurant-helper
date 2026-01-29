// ... (импорты в самом верху)

export default function InventoryPage() {
  // 1. Все useState переменные здесь...

  // 2. ВСЕ ФУНКЦИИ (Копируй их сюда)
  const handleSingleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: parseFloat(editingItem.qty) || 0 })
      .eq("id", editingItem.id);

    if (!error) {
      toast.success("Остаток изменен");
      setEditDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Вы уверены, что хотите полностью удалить этот товар с этой точки?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      toast.success("Товар удален");
      fetchData();
    }
  };

  const openStocktaking = () => {
    if (selectedLocation === "all") {
      toast.error("Сначала выберите точку");
      return;
    }
    const items = inventory
      .filter((i) => i.location_id === selectedLocation)
      .map((i) => ({
        id: i.id,
        name: i.ingredient?.name || "Без названия",
        system: i.quantity || 0,
        actual: (i.quantity || 0).toString(),
      }));
    setStocktakingItems(items);
    setStocktakingDialogOpen(true);
  };

  const handleSaveStocktaking = async () => {
    try {
      for (const item of stocktakingItems) {
        await supabase
          .from("inventory")
          .update({ quantity: parseFloat(item.actual) || 0 })
          .eq("id", item.id);
      }
      toast.success("Склад обновлен");
      setStocktakingDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  };

  // 3. САМ ЭКРАН (Внутри return)
  return (
    <div className="space-y-6 p-4">
      {/* Кнопки управления и фильтры... */}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Товар</TableHead>
            <TableHead>Остаток</TableHead>
            <TableHead>Точка</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>

        {/* ВОТ ТВОЙ TABLEBODY ВНУТРИ ТАБЛИЦЫ */}
        <TableBody>
          {filteredInv.map((item) => (
            <TableRow key={item.id} className="border-white/5">
              <TableCell className="font-medium">{item.ingredient?.name}</TableCell>
              <TableCell className="font-mono text-emerald-400">{Number(item.quantity).toFixed(2)}</TableCell>
              <TableCell className="text-zinc-500">{item.location?.name}</TableCell>
              <TableCell className="text-right flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingItem({ id: item.id, name: item.ingredient.name, qty: item.quantity });
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ВСЕ ДИАЛОГИ В САМОМ НИЗУ ПЕРЕД ПОСЛЕДНИМ </div> */}
      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        {/* Содержимое диалога инвентаризации... */}
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        {/* Содержимое диалога правки... */}
      </Dialog>
    </div>
  );
}
