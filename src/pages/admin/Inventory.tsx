import { useState, useEffect } from 'react';
import { Search, Package, ArrowRightLeft, TrendingDown, AlertTriangle, Plus, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Inventory = Tables<'inventory'>;
type Ingredient = Tables<'ingredients'>;
type Location = Tables<'locations'>;
type Unit = Tables<'units'>;
type Supply = Tables<'supplies'>;
type Transfer = Tables<'transfers'>;

interface InventoryItem extends Inventory {
  ingredient?: Ingredient & { unit?: Unit };
  location?: Location;
}

interface SupplyWithLocation extends Supply {
  location?: Location;
}

interface TransferWithLocations extends Transfer {
  from_location?: Location;
  to_location?: Location;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<(Ingredient & { unit?: Unit })[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplies, setSupplies] = useState<SupplyWithLocation[]>([]);
  const [transfers, setTransfers] = useState<TransferWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Supply dialog
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({
    location_id: '',
    supplier_name: '',
    invoice_number: '',
    items: [] as Array<{ ingredient_id: string; quantity: string; cost_per_unit: string }>,
  });

  // Transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_location_id: '',
    to_location_id: '',
    items: [] as Array<{ ingredient_id: string; quantity: string }>,
  });

  // Bulk stock dialog
  const [bulkStockDialogOpen, setBulkStockDialogOpen] = useState(false);
  const [bulkStockForm, setBulkStockForm] = useState({
    location_id: '',
    default_quantity: '100',
    items: [] as Array<{ ingredient_id: string; name: string; quantity: string; selected: boolean }>,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        { data: inv },
        { data: ings },
        { data: locs },
        { data: sups },
        { data: trans },
      ] = await Promise.all([
        supabase.from('inventory').select('*, ingredient:ingredients(*, unit:units(*)), location:locations(*)'),
        supabase.from('ingredients').select('*, unit:units(*)').eq('is_active', true).order('name'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
        supabase.from('supplies').select('*, location:locations(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('transfers').select('*, from_location:locations!transfers_from_location_id_fkey(*), to_location:locations!transfers_to_location_id_fkey(*)').order('created_at', { ascending: false }).limit(50),
      ]);

      setInventory((inv as InventoryItem[]) || []);
      setIngredients((ings as any) || []);
      setLocations(locs || []);
      setSupplies((sups as SupplyWithLocation[]) || []);
      setTransfers((trans as TransferWithLocations[]) || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openSupplyDialog = () => {
    setSupplyForm({
      location_id: locations[0]?.id || '',
      supplier_name: '',
      invoice_number: '',
      items: [{ ingredient_id: '', quantity: '', cost_per_unit: '' }],
    });
    setSupplyDialogOpen(true);
  };

  const addSupplyItem = () => {
    setSupplyForm(prev => ({
      ...prev,
      items: [...prev.items, { ingredient_id: '', quantity: '', cost_per_unit: '' }],
    }));
  };

  const updateSupplyItem = (index: number, field: string, value: string) => {
    setSupplyForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreateSupply = async () => {
    if (!supplyForm.location_id || supplyForm.items.some(i => !i.ingredient_id || !i.quantity || !i.cost_per_unit)) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const totalAmount = supplyForm.items.reduce(
        (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.cost_per_unit),
        0
      );

      // Create supply
      const { data: supply, error: supplyError } = await supabase
        .from('supplies')
        .insert({
          location_id: supplyForm.location_id,
          supplier_name: supplyForm.supplier_name || null,
          invoice_number: supplyForm.invoice_number || null,
          total_amount: totalAmount,
          status: 'received',
          received_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (supplyError) throw supplyError;

      // Create supply items
      const supplyItems = supplyForm.items.map(item => ({
        supply_id: supply.id,
        ingredient_id: item.ingredient_id,
        quantity: parseFloat(item.quantity),
        cost_per_unit: parseFloat(item.cost_per_unit),
        total_cost: parseFloat(item.quantity) * parseFloat(item.cost_per_unit),
      }));

      await supabase.from('supply_items').insert(supplyItems);

      // Update inventory
      for (const item of supplyForm.items) {
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', supplyForm.location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(existing.quantity) + parseFloat(item.quantity) })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: supplyForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: parseFloat(item.quantity),
            });
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
          location_id: supplyForm.location_id,
          ingredient_id: item.ingredient_id,
          movement_type: 'supply',
          quantity: parseFloat(item.quantity),
          cost_per_unit: parseFloat(item.cost_per_unit),
          reference_id: supply.id,
        });
      }

      toast.success('Поставка оформлена');
      setSupplyDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка оформления поставки');
    }
  };

  const openTransferDialog = () => {
    setTransferForm({
      from_location_id: locations[0]?.id || '',
      to_location_id: locations[1]?.id || '',
      items: [{ ingredient_id: '', quantity: '' }],
    });
    setTransferDialogOpen(true);
  };

  const addTransferItem = () => {
    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, { ingredient_id: '', quantity: '' }],
    }));
  };

  const updateTransferItem = (index: number, field: string, value: string) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.from_location_id || !transferForm.to_location_id || 
        transferForm.from_location_id === transferForm.to_location_id ||
        transferForm.items.some(i => !i.ingredient_id || !i.quantity)) {
      toast.error('Заполните все поля корректно');
      return;
    }

    try {
      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .insert({
          from_location_id: transferForm.from_location_id,
          to_location_id: transferForm.to_location_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const transferItems = transferForm.items.map(item => ({
        transfer_id: transfer.id,
        ingredient_id: item.ingredient_id,
        quantity: parseFloat(item.quantity),
      }));

      await supabase.from('transfer_items').insert(transferItems);

      // Update inventory - subtract from source
      for (const item of transferForm.items) {
        const qty = parseFloat(item.quantity);

        // From location - subtract
        const { data: fromInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', transferForm.from_location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (fromInv) {
          await supabase
            .from('inventory')
            .update({ quantity: Math.max(0, Number(fromInv.quantity) - qty) })
            .eq('id', fromInv.id);
        }

        // To location - add
        const { data: toInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', transferForm.to_location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (toInv) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(toInv.quantity) + qty })
            .eq('id', toInv.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: transferForm.to_location_id,
              ingredient_id: item.ingredient_id,
              quantity: qty,
            });
        }

        // Log movements
        await supabase.from('inventory_movements').insert([
          {
            location_id: transferForm.from_location_id,
            ingredient_id: item.ingredient_id,
            movement_type: 'transfer_out',
            quantity: -qty,
            reference_id: transfer.id,
          },
          {
            location_id: transferForm.to_location_id,
            ingredient_id: item.ingredient_id,
            movement_type: 'transfer_in',
            quantity: qty,
            reference_id: transfer.id,
          },
        ]);
      }

      toast.success('Перемещение оформлено');
      setTransferDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка оформления перемещения');
    }
  };

  // Bulk stock functions
  const openBulkStockDialog = () => {
    setBulkStockForm({
      location_id: locations[0]?.id || '',
      default_quantity: '100',
      items: ingredients.map(ing => ({
        ingredient_id: ing.id,
        name: ing.name,
        quantity: '100',
        selected: true,
      })),
    });
    setBulkStockDialogOpen(true);
  };

  const toggleBulkItem = (ingredientId: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.ingredient_id === ingredientId ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const updateBulkItemQuantity = (ingredientId: string, quantity: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.ingredient_id === ingredientId ? { ...item, quantity } : item
      ),
    }));
  };

  const setAllBulkQuantity = (quantity: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      default_quantity: quantity,
      items: prev.items.map(item => ({ ...item, quantity })),
    }));
  };

  const selectAllBulkItems = (selected: boolean) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, selected })),
    }));
  };

  const handleBulkStock = async () => {
    const selectedItems = bulkStockForm.items.filter(i => i.selected && parseFloat(i.quantity) > 0);
    if (!bulkStockForm.location_id || selectedItems.length === 0) {
      toast.error('Выберите локацию и хотя бы один ингредиент');
      return;
    }

    try {
      for (const item of selectedItems) {
        const qty = parseFloat(item.quantity);
        const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
        const costPerUnit = ingredient?.cost_per_unit || 0;

        // Check existing inventory
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', bulkStockForm.location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(existing.quantity) + qty })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: bulkStockForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: qty,
            });
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
          location_id: bulkStockForm.location_id,
          ingredient_id: item.ingredient_id,
          movement_type: 'adjustment',
          quantity: qty,
          cost_per_unit: costPerUnit,
          notes: 'Начальное заполнение склада',
        });
      }

      toast.success(`Добавлено ${selectedItems.length} позиций на склад`);
      setBulkStockDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка заполнения склада');
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || item.location_id === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  const lowStockItems = inventory.filter(item => 
    item.ingredient?.min_stock && Number(item.quantity) < Number(item.ingredient.min_stock)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Склад</h1>
          <p className="text-muted-foreground">Остатки, поставки и перемещения</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openBulkStockDialog}>
            <Database className="h-4 w-4 mr-2" />
            Заполнить склад
          </Button>
          <Button variant="outline" onClick={openTransferDialog}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Перемещение
          </Button>
          <Button onClick={openSupplyDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Поставка
          </Button>
        </div>
      </div>

      {/* Low stock warning */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Мало на складе ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <Badge key={item.id} variant="destructive">
                  {item.ingredient?.name}: {Number(item.quantity).toFixed(1)} {item.ingredient?.unit?.abbreviation}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Остатки</TabsTrigger>
          <TabsTrigger value="supplies">Поставки</TabsTrigger>
          <TabsTrigger value="transfers">Перемещения</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск ингредиента..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Точка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все точки</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inventory table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ингредиент</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                  <TableHead className="text-right">Мин. остаток</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Нет данных об остатках
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map(item => {
                    const isLow = item.ingredient?.min_stock && Number(item.quantity) < Number(item.ingredient.min_stock);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient?.name}</TableCell>
                        <TableCell>{item.location?.name}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.ingredient?.min_stock || '—'}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive">Мало</Badge>
                          ) : (
                            <Badge variant="outline">В норме</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="supplies">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Точка</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Накладная</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Нет поставок
                    </TableCell>
                  </TableRow>
                ) : (
                  supplies.map(sup => (
                    <TableRow key={sup.id}>
                      <TableCell>{new Date(sup.created_at).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>{sup.location?.name}</TableCell>
                      <TableCell>{sup.supplier_name || '—'}</TableCell>
                      <TableCell>{sup.invoice_number || '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₽{Number(sup.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sup.status === 'received' ? 'default' : 'secondary'}>
                          {sup.status === 'received' ? 'Получено' : sup.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Откуда</TableHead>
                  <TableHead>Куда</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Нет перемещений
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map(trans => (
                    <TableRow key={trans.id}>
                      <TableCell>{new Date(trans.created_at).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>{trans.from_location?.name}</TableCell>
                      <TableCell>{trans.to_location?.name}</TableCell>
                      <TableCell>
                        <Badge variant={trans.status === 'completed' ? 'default' : 'secondary'}>
                          {trans.status === 'completed' ? 'Завершено' : trans.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supply Dialog */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая поставка</DialogTitle>
            <DialogDescription>Оформите приход товаров на склад</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Точка *</Label>
                <Select
                  value={supplyForm.location_id}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Поставщик</Label>
                <Input
                  value={supplyForm.supplier_name}
                  onChange={(e) => setSupplyForm({ ...supplyForm, supplier_name: e.target.value })}
                  placeholder="ООО Продукты"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Номер накладной</Label>
              <Input
                value={supplyForm.invoice_number}
                onChange={(e) => setSupplyForm({ ...supplyForm, invoice_number: e.target.value })}
                placeholder="ТН-12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Товары</Label>
              {supplyForm.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={item.ingredient_id}
                    onValueChange={(v) => updateSupplyItem(index, 'ingredient_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit?.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={item.quantity}
                    onChange={(e) => updateSupplyItem(index, 'quantity', e.target.value)}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="Цена"
                    value={item.cost_per_unit}
                    onChange={(e) => updateSupplyItem(index, 'cost_per_unit', e.target.value)}
                    className="w-24"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSupplyItem}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplyDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateSupply}>Оформить поставку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Перемещение между точками</DialogTitle>
            <DialogDescription>Переместите товары с одного склада на другой</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Откуда *</Label>
                <Select
                  value={transferForm.from_location_id}
                  onValueChange={(v) => setTransferForm({ ...transferForm, from_location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Куда *</Label>
                <Select
                  value={transferForm.to_location_id}
                  onValueChange={(v) => setTransferForm({ ...transferForm, to_location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== transferForm.from_location_id).map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Товары</Label>
              {transferForm.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={item.ingredient_id}
                    onValueChange={(v) => updateTransferItem(index, 'ingredient_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit?.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={item.quantity}
                    onChange={(e) => updateTransferItem(index, 'quantity', e.target.value)}
                    className="w-24"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTransferItem}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTransfer}>Оформить перемещение</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Stock Dialog */}
      <Dialog open={bulkStockDialogOpen} onOpenChange={setBulkStockDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Быстрое заполнение склада</DialogTitle>
            <DialogDescription>Добавьте начальные остатки для всех ингредиентов сразу</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Локация *</Label>
                <Select
                  value={bulkStockForm.location_id}
                  onValueChange={(v) => setBulkStockForm({ ...bulkStockForm, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Количество для всех</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bulkStockForm.default_quantity}
                    onChange={(e) => setAllBulkQuantity(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAllBulkItems(true)}
                  >
                    Все
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAllBulkItems(false)}
                  >
                    Ничего
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="w-32">Количество</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkStockForm.items.map(item => {
                    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
                    return (
                      <TableRow key={item.ingredient_id}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleBulkItem(item.ingredient_id)}
                          />
                        </TableCell>
                        <TableCell>
                          {item.name}
                          <span className="text-muted-foreground ml-1">
                            ({ingredient?.unit?.abbreviation || ''})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateBulkItemQuantity(item.ingredient_id, e.target.value)}
                            className="w-24"
                            disabled={!item.selected}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Выбрано: {bulkStockForm.items.filter(i => i.selected).length} из {bulkStockForm.items.length} ингредиентов
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStockDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkStock}>Добавить на склад</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
