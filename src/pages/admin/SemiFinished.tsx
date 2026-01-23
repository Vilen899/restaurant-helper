import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, Package, ChefHat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { CreateIngredientDialog } from '@/components/admin/CreateIngredientDialog';

type SemiFinished = Tables<'semi_finished'>;
type Ingredient = Tables<'ingredients'>;
type Unit = Tables<'units'>;
type SemiFinishedIngredient = Tables<'semi_finished_ingredients'>;

interface SemiFinishedWithUnit extends SemiFinished {
  unit?: Unit;
}

interface SemiFinishedIngredientWithDetails extends SemiFinishedIngredient {
  ingredient?: Ingredient & { unit?: Unit };
}

export default function SemiFinishedPage() {
  const [semiFinished, setSemiFinished] = useState<SemiFinishedWithUnit[]>([]);
  const [ingredients, setIngredients] = useState<(Ingredient & { unit?: Unit })[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit_id: '',
    output_quantity: '1',
    is_active: true,
  });

  // Recipe dialog
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedSemiFinished, setSelectedSemiFinished] = useState<SemiFinishedWithUnit | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<SemiFinishedIngredientWithDetails[]>([]);
  const [newIngredient, setNewIngredient] = useState({ ingredient_id: '', quantity: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: sf }, { data: ings }, { data: u }] = await Promise.all([
        supabase.from('semi_finished').select('*, unit:units(*)').order('name'),
        supabase.from('ingredients').select('*, unit:units(*)').eq('is_active', true).order('name'),
        supabase.from('units').select('*').order('name'),
      ]);

      setSemiFinished((sf as SemiFinishedWithUnit[]) || []);
      setIngredients((ings as any) || []);
      setUnits(u || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      unit_id: units[0]?.id || '',
      output_quantity: '1',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: SemiFinished) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      unit_id: item.unit_id,
      output_quantity: String(item.output_quantity),
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.unit_id || !formData.output_quantity) {
      toast.error('Заполните обязательные поля');
      return;
    }

    try {
      const data = {
        name: formData.name,
        unit_id: formData.unit_id,
        output_quantity: parseFloat(formData.output_quantity),
        is_active: formData.is_active,
      };

      if (editingId) {
        await supabase.from('semi_finished').update(data).eq('id', editingId);
        toast.success('Заготовка обновлена');
      } else {
        await supabase.from('semi_finished').insert(data);
        toast.success('Заготовка создана');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить заготовку?')) return;

    try {
      await supabase.from('semi_finished').delete().eq('id', id);
      toast.success('Заготовка удалена');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  // Recipe management
  const openRecipeDialog = async (item: SemiFinishedWithUnit) => {
    setSelectedSemiFinished(item);
    setNewIngredient({ ingredient_id: '', quantity: '' });

    const { data } = await supabase
      .from('semi_finished_ingredients')
      .select('*, ingredient:ingredients(*, unit:units(*))')
      .eq('semi_finished_id', item.id);

    setRecipeIngredients((data as SemiFinishedIngredientWithDetails[]) || []);
    setRecipeDialogOpen(true);
  };

  const addIngredientToRecipe = async () => {
    if (!selectedSemiFinished || !newIngredient.ingredient_id || !newIngredient.quantity) {
      toast.error('Выберите ингредиент и укажите количество');
      return;
    }

    try {
      await supabase.from('semi_finished_ingredients').insert({
        semi_finished_id: selectedSemiFinished.id,
        ingredient_id: newIngredient.ingredient_id,
        quantity: parseFloat(newIngredient.quantity),
      });

      toast.success('Ингредиент добавлен');
      setNewIngredient({ ingredient_id: '', quantity: '' });
      openRecipeDialog(selectedSemiFinished);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка добавления');
    }
  };

  const removeIngredientFromRecipe = async (id: string) => {
    try {
      await supabase.from('semi_finished_ingredients').delete().eq('id', id);
      toast.success('Ингредиент удалён');
      if (selectedSemiFinished) {
        openRecipeDialog(selectedSemiFinished);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const calculateRecipeCost = (): number => {
    return recipeIngredients.reduce((sum, ri) => {
      const cost = ri.ingredient?.cost_per_unit || 0;
      return sum + Number(cost) * Number(ri.quantity);
    }, 0);
  };

  const filteredItems = semiFinished.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Заготовки</h1>
          <p className="text-muted-foreground">Полуфабрикаты и их рецептуры</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Новая заготовка
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск заготовки..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Выход</TableHead>
              <TableHead>Ингредиентов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'Ничего не найдено' : 'Нет заготовок. Создайте первую!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {Number(item.output_quantity)} {item.unit?.abbreviation}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRecipeDialog(item)}
                      className="gap-1"
                    >
                      <ChefHat className="h-4 w-4" />
                      Рецепт
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать заготовку' : 'Новая заготовка'}</DialogTitle>
            <DialogDescription>Укажите название и выход готового продукта</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Соус Цезарь"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Выход *</Label>
                <Input
                  type="number"
                  value={formData.output_quantity}
                  onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label>Единица *</Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(v) => setFormData({ ...formData, unit_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Активна</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Рецепт: {selectedSemiFinished?.name}</DialogTitle>
            <DialogDescription>
              Выход: {selectedSemiFinished?.output_quantity} {selectedSemiFinished?.unit?.abbreviation} • 
              Себестоимость: {calculateRecipeCost().toFixed(0)} ֏
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current ingredients */}
            {recipeIngredients.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeIngredients.map(ri => (
                    <TableRow key={ri.id}>
                      <TableCell>{ri.ingredient?.name}</TableCell>
                      <TableCell className="text-right">
                        {Number(ri.quantity)} {ri.ingredient?.unit?.abbreviation}
                      </TableCell>
                      <TableCell className="text-right">
                        {(Number(ri.quantity) * Number(ri.ingredient?.cost_per_unit || 0)).toFixed(0)} ֏
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredientFromRecipe(ri.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add ingredient */}
            <div className="flex gap-2 items-end border-t pt-4">
              <div className="flex-1">
                <Label className="text-xs">Ингредиент</Label>
                <Select
                  value={newIngredient.ingredient_id}
                  onValueChange={(v) => setNewIngredient({ ...newIngredient, ingredient_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients
                      .filter(i => !recipeIngredients.some(ri => ri.ingredient_id === i.id))
                      .map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.unit?.abbreviation})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <CreateIngredientDialog
                units={units}
                onCreated={(newIng) => {
                  fetchData();
                  setNewIngredient({ ...newIngredient, ingredient_id: newIng.id });
                }}
              />
              <div className="w-28">
                <Label className="text-xs">Количество</Label>
                <Input
                  type="number"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button onClick={addIngredientToRecipe}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setRecipeDialogOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
