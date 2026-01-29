// --- ТОЧЕЧНАЯ ПРАВКА ---
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

  // --- УДАЛЕНИЕ ТОВАРА СО СКЛАДА ---
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Вы уверены, что хотите полностью удалить этот товар с этой точки?")) return;
    
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id);
    
    if (!error) {
      toast.success("Товар удален со склада");
      fetchData();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  // --- ИНВЕНТАРИЗАЦИЯ (С ИСПРАВЛЕННЫМ ВВОДОМ) ---
  const openStocktaking = () => {
    if (selectedLocation === "all") {
      toast.error("Сначала выберите точку в фильтре");
      return;
    }
    const items = inventory
      .filter(i => i.location_id === selectedLocation)
      .map(i => ({
        id: i.id,
        name: i.ingredient?.name || "Без названия",
        system: i.quantity || 0,
        actual: (i.quantity || 0).toString() 
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
  };<TableBody>
  {filteredInv.map(item => (
    <TableRow key={item.id} className="border-white/5">
      <TableCell className="font-medium">{item.ingredient?.name}</TableCell>
      <TableCell className="font-mono text-emerald-400">
        {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
      </TableCell>
      <TableCell className="text-zinc-500">{item.location?.name}</TableCell>
      <TableCell className="text-right flex justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={() => { 
          setEditingItem({id: item.id, name: item.ingredient.name, qty: item.quantity}); 
          setEditDialogOpen(true); 
        }}>
          <Edit3 className="w-4 h-4 text-indigo-400" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody><Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
  <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
    <DialogHeader>
      <DialogTitle>Инвентаризация: {locations.find(l => l.id === selectedLocation)?.name}</DialogTitle>
    </DialogHeader>
    <div className="max-h-[400px] overflow-y-auto border border-white/5 rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Товар</TableHead>
            <TableHead>Система</TableHead>
            <TableHead>Факт</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocktakingItems.map((item, idx) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell className="text-zinc-500">{Number(item.system).toFixed(2)}</TableCell>
              <TableCell>
                <Input 
                  type="number" 
                  value={item.actual} 
                  className="w-24 bg-white/5 h-8 border-white/10" 
                  onChange={(e) => {
                    const newItems = [...stocktakingItems];
                    newItems[idx].actual = e.target.value; // ПОЗВОЛЯЕТ ПЕЧАТАТЬ
                    setStocktakingItems(newItems);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <Button onClick={handleSaveStocktaking} className="bg-indigo-600 h-12 w-full mt-4">
      Применить остатки
    </Button>
  </DialogContent>
</Dialog>