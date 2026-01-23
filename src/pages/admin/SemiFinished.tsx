import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Edit, Package, ChefHat, Check, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { CreateIngredientDialog } from '@/components/admin/CreateIngredientDialog';
import { cn } from '@/lib/utils';

type SemiFinished = Tables<'semi_finished'>;
type Ingredient = Tables<'ingredients'>;
type Unit = Tables<'units'>;
type SemiFinishedIngredient = Tables<'semi_finished_ingredients'>;

interface SemiFinishedWithUnit extends SemiFinished {
  unit?: Unit;
}

interface SemiFinishedIngredientWithDetails extends SemiFinishedIngredient {
  ingredient?: Ingredient & { unit?: Unit };
  semi_finished_component?: SemiFinishedWithUnit;
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

  // Recipe in dialog
  const [dialogRecipeIngredients, setDialogRecipeIngredients] = useState<SemiFinishedIngredientWithDetails[]>([]);
  const [dialogNewIngredient, setDialogNewIngredient] = useState({ ingredient_id: '', quantity: '' });
  const [dialogNewSemiFinished, setDialogNewSemiFinished] = useState({ semi_finished_id: '', quantity: '' });
  const [dialogRecipeTab, setDialogRecipeTab] = useState<'ingredients' | 'semifinished'>('ingredients');
  const [ingredientSearchOpen, setIngredientSearchOpen] = useState(false);
  const [sfSearchOpen, setSfSearchOpen] = useState(false);
  
  // Autofocus ref
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Separate Recipe dialog (for viewing from table)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedSemiFinished, setSelectedSemiFinished] = useState<SemiFinishedWithUnit | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<SemiFinishedIngredientWithDetails[]>([]);
  const [newIngredient, setNewIngredient] = useState({ ingredient_id: '', quantity: '' });
  const [newSemiFinished, setNewSemiFinished] = useState({ semi_finished_id: '', quantity: '' });
  const [recipeTab, setRecipeTab] = useState<'ingredients' | 'semifinished'>('ingredients');

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
    setDialogRecipeIngredients([]);
    setDialogNewIngredient({ ingredient_id: '', quantity: '' });
    setDialogNewSemiFinished({ semi_finished_id: '', quantity: '' });
    setDialogRecipeTab('ingredients');
    setDialogOpen(true);
    // Autofocus on name field after dialog opens
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const openEditDialog = async (item: SemiFinished) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      unit_id: item.unit_id,
      output_quantity: String(item.output_quantity),
      is_active: item.is_active,
    });
    
    // Load existing recipe
    const { data } = await supabase
      .from('semi_finished_ingredients')
      .select(`
        *,
        ingredient:ingredients(*, unit:units(*)),
        semi_finished_component:semi_finished!semi_finished_ingredients_semi_finished_component_id_fkey(*, unit:units(*))
      `)
      .eq('semi_finished_id', item.id);
    
    setDialogRecipeIngredients((data as unknown as SemiFinishedIngredientWithDetails[]) || []);
    setDialogNewIngredient({ ingredient_id: '', quantity: '' });
    setDialogNewSemiFinished({ semi_finished_id: '', quantity: '' });
    setDialogRecipeTab('ingredients');
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

      let semiFinishedId = editingId;

      if (editingId) {
        await supabase.from('semi_finished').update(data).eq('id', editingId);
      } else {
        const { data: newSf, error } = await supabase.from('semi_finished').insert(data).select().single();
        if (error) throw error;
        semiFinishedId = newSf.id;
      }

      // Save recipe ingredients (for new items, we need to save after getting ID)
      if (semiFinishedId && dialogRecipeIngredients.length > 0 && !editingId) {
        // Insert all pending ingredients for new semi-finished
        for (const ri of dialogRecipeIngredients) {
          await supabase.from('semi_finished_ingredients').insert({
            semi_finished_id: semiFinishedId,
            ingredient_id: ri.ingredient_id || null,
            semi_finished_component_id: ri.semi_finished_component_id || null,
            quantity: ri.quantity,
          });
        }
      }

      toast.success(editingId ? 'Заготовка обновлена' : 'Заготовка создана');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  // Add ingredient in dialog (for edit mode - save immediately, for create - add to local state)
  const addDialogIngredient = async () => {
    if (!dialogNewIngredient.ingredient_id || !dialogNewIngredient.quantity) {
      toast.error('Выберите ингредиент и укажите количество');
      return;
    }

    const qtyStr = String(dialogNewIngredient.quantity).trim().replace(',', '.');
    const qty = parseFloat(qtyStr);
    if (!Number.isFinite(qty) || qty < 0.001) {
      toast.error('Количество должно быть не меньше 0.001');
      return;
    }

    if (editingId) {
      // Save immediately for existing semi-finished
      try {
        await supabase.from('semi_finished_ingredients').insert({
          semi_finished_id: editingId,
          ingredient_id: dialogNewIngredient.ingredient_id,
          quantity: parseFloat(dialogNewIngredient.quantity),
        });
        
        // Reload recipe
        const { data } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            *,
            ingredient:ingredients(*, unit:units(*)),
            semi_finished_component:semi_finished!semi_finished_ingredients_semi_finished_component_id_fkey(*, unit:units(*))
          `)
          .eq('semi_finished_id', editingId);
        
        setDialogRecipeIngredients((data as unknown as SemiFinishedIngredientWithDetails[]) || []);
        toast.success('Ингредиент добавлен');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Ошибка добавления');
      }
    } else {
      // Add to local state for new semi-finished
      const ing = ingredients.find(i => i.id === dialogNewIngredient.ingredient_id);
      const newItem: SemiFinishedIngredientWithDetails = {
        id: `temp-${Date.now()}`,
        semi_finished_id: '',
        ingredient_id: dialogNewIngredient.ingredient_id,
        semi_finished_component_id: null,
        quantity: parseFloat(dialogNewIngredient.quantity),
        created_at: new Date().toISOString(),
        ingredient: ing,
      };
      setDialogRecipeIngredients(prev => [...prev, newItem]);
    }
    
    setDialogNewIngredient({ ingredient_id: '', quantity: '' });
  };

  // Add semi-finished component in dialog
  const addDialogSemiFinished = async () => {
    if (!dialogNewSemiFinished.semi_finished_id || !dialogNewSemiFinished.quantity) {
      toast.error('Выберите заготовку и укажите количество');
      return;
    }

    const qtyStr = String(dialogNewSemiFinished.quantity).trim().replace(',', '.');
    const qty = parseFloat(qtyStr);
    if (!Number.isFinite(qty) || qty < 0.001) {
      toast.error('Количество должно быть не меньше 0.001');
      return;
    }

    if (editingId && dialogNewSemiFinished.semi_finished_id === editingId) {
      toast.error('Нельзя добавить заготовку саму в себя');
      return;
    }

    if (editingId) {
      // Save immediately for existing semi-finished
      try {
        await supabase.from('semi_finished_ingredients').insert({
          semi_finished_id: editingId,
          semi_finished_component_id: dialogNewSemiFinished.semi_finished_id,
          quantity: parseFloat(dialogNewSemiFinished.quantity),
        });
        
        // Reload recipe
        const { data } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            *,
            ingredient:ingredients(*, unit:units(*)),
            semi_finished_component:semi_finished!semi_finished_ingredients_semi_finished_component_id_fkey(*, unit:units(*))
          `)
          .eq('semi_finished_id', editingId);
        
        setDialogRecipeIngredients((data as unknown as SemiFinishedIngredientWithDetails[]) || []);
        toast.success('Заготовка добавлена');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Ошибка добавления');
      }
    } else {
      // Add to local state for new semi-finished
      const sf = semiFinished.find(s => s.id === dialogNewSemiFinished.semi_finished_id);
      const newItem: SemiFinishedIngredientWithDetails = {
        id: `temp-${Date.now()}`,
        semi_finished_id: '',
        ingredient_id: null,
        semi_finished_component_id: dialogNewSemiFinished.semi_finished_id,
        quantity: parseFloat(dialogNewSemiFinished.quantity),
        created_at: new Date().toISOString(),
        semi_finished_component: sf,
      };
      setDialogRecipeIngredients(prev => [...prev, newItem]);
    }
    
    setDialogNewSemiFinished({ semi_finished_id: '', quantity: '' });
  };

  // Remove ingredient from dialog
  const removeDialogIngredient = async (id: string) => {
    if (id.startsWith('temp-')) {
      // Remove from local state
      setDialogRecipeIngredients(prev => prev.filter(ri => ri.id !== id));
    } else {
      // Delete from DB
      try {
        await supabase.from('semi_finished_ingredients').delete().eq('id', id);
        setDialogRecipeIngredients(prev => prev.filter(ri => ri.id !== id));
        toast.success('Удалено');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Ошибка удаления');
      }
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
    setNewSemiFinished({ semi_finished_id: '', quantity: '' });
    setRecipeTab('ingredients');

    const { data } = await supabase
      .from('semi_finished_ingredients')
      .select(`
        *,
        ingredient:ingredients(*, unit:units(*)),
        semi_finished_component:semi_finished!semi_finished_ingredients_semi_finished_component_id_fkey(*, unit:units(*))
      `)
      .eq('semi_finished_id', item.id);

    setRecipeIngredients((data as unknown as SemiFinishedIngredientWithDetails[]) || []);
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

  const addSemiFinishedToRecipe = async () => {
    if (!selectedSemiFinished || !newSemiFinished.semi_finished_id || !newSemiFinished.quantity) {
      toast.error('Выберите заготовку и укажите количество');
      return;
    }

    // Prevent adding itself
    if (newSemiFinished.semi_finished_id === selectedSemiFinished.id) {
      toast.error('Нельзя добавить заготовку саму в себя');
      return;
    }

    try {
      await supabase.from('semi_finished_ingredients').insert({
        semi_finished_id: selectedSemiFinished.id,
        semi_finished_component_id: newSemiFinished.semi_finished_id,
        quantity: parseFloat(newSemiFinished.quantity),
      });

      toast.success('Заготовка добавлена');
      setNewSemiFinished({ semi_finished_id: '', quantity: '' });
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
      if (ri.ingredient) {
        const cost = ri.ingredient?.cost_per_unit || 0;
        return sum + Number(cost) * Number(ri.quantity);
      }
      if (ri.semi_finished_component) {
        // Calculate cost of nested semi-finished based on its ingredients
        // This is a simplified calculation - actual cost comes from DB
        return sum; // Will be calculated via trigger
      }
      return sum;
    }, 0);
  };

  const getItemName = (ri: SemiFinishedIngredientWithDetails) => {
    if (ri.ingredient) return ri.ingredient.name;
    if (ri.semi_finished_component) return `🍳 ${ri.semi_finished_component.name}`;
    return '—';
  };

  const getItemUnit = (ri: SemiFinishedIngredientWithDetails) => {
    if (ri.ingredient) return ri.ingredient.unit?.abbreviation || '';
    if (ri.semi_finished_component) return ri.semi_finished_component.unit?.abbreviation || '';
    return '';
  };

  const getItemCost = (ri: SemiFinishedIngredientWithDetails): number => {
    if (ri.ingredient) {
      return Number(ri.quantity) * Number(ri.ingredient.cost_per_unit || 0);
    }
    // For semi-finished, we'd need to calculate based on its ingredients
    return 0;
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать заготовку' : 'Новая заготовка'}</DialogTitle>
            <DialogDescription>Укажите название, выход и состав</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic info */}
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                ref={nameInputRef}
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

            {/* Recipe section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Рецепт (состав)
              </h4>

              {/* Current ingredients in dialog */}
              {dialogRecipeIngredients.length > 0 && (
                <div className="mb-4 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Компонент</TableHead>
                        <TableHead className="text-right">Количество</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dialogRecipeIngredients.map(ri => (
                        <TableRow key={ri.id}>
                          <TableCell>{getItemName(ri)}</TableCell>
                          <TableCell className="text-right">
                            {Number(ri.quantity)} {getItemUnit(ri)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDialogIngredient(ri.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Add component tabs */}
              <Tabs value={dialogRecipeTab} onValueChange={(v) => setDialogRecipeTab(v as 'ingredients' | 'semifinished')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ingredients">Ингредиенты</TabsTrigger>
                  <TabsTrigger value="semifinished">Заготовки</TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients" className="mt-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Ингредиент</Label>
                      <Popover open={ingredientSearchOpen} onOpenChange={setIngredientSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ingredientSearchOpen}
                            className="w-full justify-between font-normal"
                          >
                            {dialogNewIngredient.ingredient_id
                              ? (() => {
                                  const ing = ingredients.find(i => i.id === dialogNewIngredient.ingredient_id);
                                  return ing ? `${ing.name} (${ing.unit?.abbreviation})` : 'Выберите...';
                                })()
                              : 'Выберите...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Поиск ингредиента..." />
                            <CommandList>
                              <CommandEmpty>Не найдено</CommandEmpty>
                              <CommandGroup>
                                {ingredients
                                  .filter(i => !dialogRecipeIngredients.some(ri => ri.ingredient_id === i.id))
                                  .map(i => (
                                    <CommandItem
                                      key={i.id}
                                      value={i.name}
                                      onSelect={() => {
                                        setDialogNewIngredient({ ...dialogNewIngredient, ingredient_id: i.id });
                                        setIngredientSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          dialogNewIngredient.ingredient_id === i.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {i.name} ({i.unit?.abbreviation})
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <CreateIngredientDialog
                      units={units}
                      onCreated={(newIng) => {
                        fetchData();
                        setDialogNewIngredient({ ...dialogNewIngredient, ingredient_id: newIng.id });
                      }}
                    />
                    <div className="w-24">
                      <Label className="text-xs">Кол-во</Label>
                      <Input
                        type="number"
                        value={dialogNewIngredient.quantity}
                        onChange={(e) => setDialogNewIngredient({ ...dialogNewIngredient, quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <Button size="icon" onClick={addDialogIngredient}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="semifinished" className="mt-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Заготовка</Label>
                      <Popover open={sfSearchOpen} onOpenChange={setSfSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={sfSearchOpen}
                            className="w-full justify-between font-normal"
                          >
                            {dialogNewSemiFinished.semi_finished_id
                              ? (() => {
                                  const sf = semiFinished.find(s => s.id === dialogNewSemiFinished.semi_finished_id);
                                  return sf ? `${sf.name} (${sf.unit?.abbreviation})` : 'Выберите...';
                                })()
                              : 'Выберите...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Поиск заготовки..." />
                            <CommandList>
                              <CommandEmpty>Не найдено</CommandEmpty>
                              <CommandGroup>
                                {semiFinished
                                  .filter(sf => 
                                    sf.id !== editingId && 
                                    sf.is_active &&
                                    !dialogRecipeIngredients.some(ri => ri.semi_finished_component_id === sf.id)
                                  )
                                  .map(sf => (
                                    <CommandItem
                                      key={sf.id}
                                      value={sf.name}
                                      onSelect={() => {
                                        setDialogNewSemiFinished({ ...dialogNewSemiFinished, semi_finished_id: sf.id });
                                        setSfSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          dialogNewSemiFinished.semi_finished_id === sf.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {sf.name} ({sf.unit?.abbreviation})
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Кол-во</Label>
                      <Input
                        type="number"
                        value={dialogNewSemiFinished.quantity}
                        onChange={(e) => setDialogNewSemiFinished({ ...dialogNewSemiFinished, quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <Button size="icon" onClick={addDialogSemiFinished}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Количество в единицах измерения выбранной заготовки.
                  </p>
                </TabsContent>
              </Tabs>
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
            {/* Current recipe items */}
            {recipeIngredients.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Компонент</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeIngredients.map(ri => (
                    <TableRow key={ri.id}>
                      <TableCell>{getItemName(ri)}</TableCell>
                      <TableCell className="text-right">
                        {Number(ri.quantity)} {getItemUnit(ri)}
                      </TableCell>
                      <TableCell className="text-right">
                        {getItemCost(ri).toFixed(0)} ֏
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

            {/* Add component tabs */}
            <Tabs value={recipeTab} onValueChange={(v) => setRecipeTab(v as 'ingredients' | 'semifinished')} className="border-t pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ingredients">Ингредиенты</TabsTrigger>
                <TabsTrigger value="semifinished">Заготовки</TabsTrigger>
              </TabsList>

              <TabsContent value="ingredients" className="mt-4">
                <div className="flex gap-2 items-end">
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
              </TabsContent>

              <TabsContent value="semifinished" className="mt-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Заготовка</Label>
                    <Select
                      value={newSemiFinished.semi_finished_id}
                      onValueChange={(v) => setNewSemiFinished({ ...newSemiFinished, semi_finished_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите..." />
                      </SelectTrigger>
                      <SelectContent>
                        {semiFinished
                          .filter(sf => 
                            sf.id !== selectedSemiFinished?.id && 
                            sf.is_active &&
                            !recipeIngredients.some(ri => ri.semi_finished_component_id === sf.id)
                          )
                          .map(sf => (
                            <SelectItem key={sf.id} value={sf.id}>
                              {sf.name} ({sf.unit?.abbreviation}) — выход: {Number(sf.output_quantity)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Количество</Label>
                    <Input
                      type="number"
                      value={newSemiFinished.quantity}
                      onChange={(e) => setNewSemiFinished({ ...newSemiFinished, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={addSemiFinishedToRecipe}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Укажите сколько единиц заготовки нужно. При списании система рассчитает пропорционально ингредиенты.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button onClick={() => setRecipeDialogOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
