import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Ingredient = Tables<'ingredients'>;
type Unit = Tables<'units'>;

interface IngredientWithUnit extends Ingredient {
  unit?: Unit;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientWithUnit[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Ingredient | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    unit_id: '',
    cost_per_unit: '',
    min_stock: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: ings }, { data: unitsData }] = await Promise.all([
        supabase.from('ingredients').select('*, unit:units(*)').order('name'),
        supabase.from('units').select('*'),
      ]);

      setIngredients((ings as IngredientWithUnit[]) || []);
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditItem(null);
    setFormData({
      name: '',
      unit_id: units[0]?.id || '',
      cost_per_unit: '',
      min_stock: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: Ingredient) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      unit_id: item.unit_id,
      cost_per_unit: item.cost_per_unit.toString(),
      min_stock: item.min_stock?.toString() || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.unit_id || !formData.cost_per_unit) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const data = {
      name: formData.name,
      unit_id: formData.unit_id,
      cost_per_unit: parseFloat(formData.cost_per_unit),
      min_stock: formData.min_stock ? parseFloat(formData.min_stock) : 0,
      is_active: formData.is_active,
    };

    try {
      if (editItem) {
        const { error } = await supabase
          .from('ingredients')
          .update(data)
          .eq('id', editItem.id);

        if (error) throw error;
        toast.success('Ингредиент обновлён');
      } else {
        const { error } = await supabase
          .from('ingredients')
          .insert(data);

        if (error) throw error;
        toast.success('Ингредиент добавлен');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот ингредиент?')) return;

    try {
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ингредиент удалён');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления. Возможно ингредиент используется в рецептах.');
    }
  };

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Ингредиенты</h1>
          <p className="text-muted-foreground">Сырьё для приготовления блюд</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск ингредиента..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ingredients table */}
      {filteredIngredients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ингредиенты не найдены</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              Добавить первый ингредиент
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Ед. изм.</TableHead>
                <TableHead className="text-right">Цена за ед.</TableHead>
                <TableHead className="text-right">Мин. остаток</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map(ing => (
                <TableRow key={ing.id} className={!ing.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>{ing.unit?.abbreviation}</TableCell>
                  <TableCell className="text-right">
                    ₽ {Number(ing.cost_per_unit).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {ing.min_stock || '—'}
                  </TableCell>
                  <TableCell>
                    {ing.is_active ? (
                      <span className="text-green-500 text-sm">Активен</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Отключён</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(ing)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ing.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Редактировать ингредиент' : 'Добавить ингредиент'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Измените данные ингредиента' : 'Заполните информацию о новом ингредиенте'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Куриное филе"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Единица измерения *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите ед. изм." />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Цена за ед. (₽) *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                  placeholder="350.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Мин. остаток</Label>
                <Input
                  id="min_stock"
                  type="number"
                  step="0.001"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Активен</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {editItem ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
