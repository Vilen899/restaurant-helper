import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, ChefHat, Upload, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { RecipeImportDialog } from '@/components/admin/RecipeImportDialog';
import { CreateIngredientDialog } from '@/components/admin/CreateIngredientDialog';

type MenuItem = Tables<'menu_items'>;
type Ingredient = Tables<'ingredients'>;
type Unit = Tables<'units'>;
type MenuItemIngredient = Tables<'menu_item_ingredients'>;
type SemiFinished = Tables<'semi_finished'>;
type SemiFinishedIngredient = Tables<'semi_finished_ingredients'>;

interface RecipeIngredient extends MenuItemIngredient {
  ingredient?: Ingredient & { unit?: Unit };
  semi_finished?: SemiFinished & { 
    unit?: Unit;
    calculated_cost?: number;
  };
}

interface SemiFinishedWithDetails extends SemiFinished {
  unit?: Unit;
  calculated_cost?: number;
  semi_finished_ingredients?: (SemiFinishedIngredient & {
    ingredient?: Ingredient & { unit?: Unit };
  })[];
}

export default function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [semiFinished, setSemiFinished] = useState<SemiFinishedWithDetails[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Recipe dialog
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Add ingredient/semi-finished form
  const [addType, setAddType] = useState<'ingredient' | 'semi_finished'>('ingredient');
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newSemiFinishedId, setNewSemiFinishedId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: items }, { data: ings }, { data: unitsData }, { data: semiData }] = await Promise.all([
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('ingredients').select('*, unit:units(*)').eq('is_active', true).order('name'),
        supabase.from('units').select('*'),
        supabase.from('semi_finished').select('*, unit:units(*), semi_finished_ingredients(*, ingredient:ingredients(*, unit:units(*)))').eq('is_active', true).order('name'),
      ]);

      // Calculate cost for each semi-finished
      const semiWithCost = (semiData || []).map((sf: SemiFinishedWithDetails) => {
        const totalCost = (sf.semi_finished_ingredients || []).reduce((sum, sfi) => {
          return sum + (Number(sfi.quantity) * Number(sfi.ingredient?.cost_per_unit || 0));
        }, 0);
        const costPerUnit = totalCost / Number(sf.output_quantity || 1);
        return { ...sf, calculated_cost: costPerUnit };
      });

      setMenuItems(items || []);
      setIngredients(ings || []);
      setUnits(unitsData || []);
      setSemiFinished(semiWithCost);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openRecipeDialog = async (item: MenuItem) => {
    setSelectedItem(item);
    setRecipeDialogOpen(true);
    setAddType('ingredient');
    setNewIngredientId('');
    setNewSemiFinishedId('');
    setNewIngredientQty('');

    // Fetch recipe ingredients with both ingredients and semi_finished
    const { data } = await supabase
      .from('menu_item_ingredients')
      .select('*, ingredient:ingredients(*, unit:units(*)), semi_finished:semi_finished(*, unit:units(*))')
      .eq('menu_item_id', item.id);

    // Enrich semi_finished with calculated cost
    const enrichedData = (data || []).map((ri: any) => {
      if (ri.semi_finished) {
        const sf = semiFinished.find(s => s.id === ri.semi_finished_id);
        return { ...ri, semi_finished: { ...ri.semi_finished, calculated_cost: sf?.calculated_cost } };
      }
      return ri;
    });

    setRecipeIngredients(enrichedData as RecipeIngredient[]);
  };

  const addIngredientToRecipe = async () => {
    if (!selectedItem || !newIngredientQty) {
      toast.error('Укажите количество');
      return;
    }

    if (addType === 'ingredient' && !newIngredientId) {
      toast.error('Выберите ингредиент');
      return;
    }

    if (addType === 'semi_finished' && !newSemiFinishedId) {
      toast.error('Выберите заготовку');
      return;
    }

    // Check for duplicates
    if (addType === 'ingredient') {
      const existing = recipeIngredients.find(ri => ri.ingredient_id === newIngredientId);
      if (existing) {
        toast.error('Этот ингредиент уже добавлен');
        return;
      }
    } else {
      const existing = recipeIngredients.find(ri => ri.semi_finished_id === newSemiFinishedId);
      if (existing) {
        toast.error('Эта заготовка уже добавлена');
        return;
      }
    }

    try {
      const insertData = {
        menu_item_id: selectedItem.id,
        quantity: parseFloat(newIngredientQty),
        ingredient_id: addType === 'ingredient' ? newIngredientId : null,
        semi_finished_id: addType === 'semi_finished' ? newSemiFinishedId : null,
      };

      const { data, error } = await supabase
        .from('menu_item_ingredients')
        .insert(insertData)
        .select('*, ingredient:ingredients(*, unit:units(*)), semi_finished:semi_finished(*, unit:units(*))')
        .single();

      if (error) throw error;

      // Enrich with calculated cost
      const enrichedData = { ...data } as RecipeIngredient;
      if (data.semi_finished) {
        const sf = semiFinished.find(s => s.id === data.semi_finished_id);
        enrichedData.semi_finished = { ...data.semi_finished, calculated_cost: sf?.calculated_cost };
      }

      setRecipeIngredients([...recipeIngredients, enrichedData]);
      setNewIngredientId('');
      setNewSemiFinishedId('');
      setNewIngredientQty('');
      toast.success(addType === 'ingredient' ? 'Ингредиент добавлен' : 'Заготовка добавлена');

      // Refresh menu items to get updated cost
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка добавления');
    }
  };

  const removeIngredientFromRecipe = async (ingredientRecordId: string) => {
    try {
      const { error } = await supabase
        .from('menu_item_ingredients')
        .delete()
        .eq('id', ingredientRecordId);

      if (error) throw error;

      setRecipeIngredients(recipeIngredients.filter(ri => ri.id !== ingredientRecordId));
      toast.success('Ингредиент удалён');

      // Refresh menu items to get updated cost
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const calculateRecipeCost = () => {
    return recipeIngredients.reduce((total, ri) => {
      const quantity = Number(ri.quantity);
      if (ri.ingredient_id && ri.ingredient) {
        return total + (Number(ri.ingredient.cost_per_unit || 0) * quantity);
      } else if (ri.semi_finished_id && ri.semi_finished) {
        return total + (Number(ri.semi_finished.calculated_cost || 0) * quantity);
      }
      return total;
    }, 0);
  };

  const getItemName = (ri: RecipeIngredient) => {
    if (ri.ingredient) return ri.ingredient.name;
    if (ri.semi_finished) return ri.semi_finished.name;
    return '—';
  };

  const getItemUnit = (ri: RecipeIngredient) => {
    if (ri.ingredient?.unit) return ri.ingredient.unit.abbreviation;
    if (ri.semi_finished?.unit) return ri.semi_finished.unit.abbreviation;
    return '';
  };

  const getItemCostPerUnit = (ri: RecipeIngredient) => {
    if (ri.ingredient) return Number(ri.ingredient.cost_per_unit || 0);
    if (ri.semi_finished) return Number(ri.semi_finished.calculated_cost || 0);
    return 0;
  };

  const getItemType = (ri: RecipeIngredient): 'ingredient' | 'semi_finished' => {
    return ri.semi_finished_id ? 'semi_finished' : 'ingredient';
  };

  const filteredItems = menuItems.filter(item =>
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
          <h1 className="text-3xl font-bold">Рецепты и тех.карты</h1>
          <p className="text-muted-foreground">Состав блюд и калькуляция себестоимости</p>
        </div>
        <Button onClick={() => setImportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Импорт из Excel
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск блюда..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Menu items with recipes */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Блюда не найдены</p>
            <p className="text-sm text-muted-foreground mt-2">
              Сначала добавьте блюда в меню
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openRecipeDialog(item)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>
                      {item.output_weight ? `Выход: ${item.output_weight} г` : 'Выход не указан'}
                    </CardDescription>
                  </div>
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Цена продажи</p>
                    <p className="text-lg font-bold">{Number(item.price).toLocaleString()} ֏</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Себестоимость</p>
                    <p className="text-lg font-bold text-primary">
                      {Number(item.cost_price).toLocaleString()} ֏
                    </p>
                  </div>
                </div>
                {Number(item.cost_price) > 0 && (
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Маржа</span>
                    <Badge variant={Number(item.price) - Number(item.cost_price) > 0 ? 'default' : 'destructive'}>
                      {(Number(item.price) - Number(item.cost_price)).toLocaleString()} ֏ (
                      {Math.round((Number(item.price) - Number(item.cost_price)) / Number(item.price) * 100)}%)
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Тех.карта: {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>
              Управляйте составом блюда. Себестоимость рассчитывается автоматически.
            </DialogDescription>
          </DialogHeader>

          {/* Recipe summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Цена продажи</p>
              <p className="text-xl font-bold">{Number(selectedItem?.price || 0).toLocaleString()} ֏</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Себестоимость</p>
              <p className="text-xl font-bold text-primary">
                {calculateRecipeCost().toLocaleString()} ֏
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Маржа</p>
              <p className="text-xl font-bold text-green-500">
                {selectedItem && calculateRecipeCost() > 0
                  ? `${Math.round((Number(selectedItem.price) - calculateRecipeCost()) / Number(selectedItem.price) * 100)}%`
                  : '—'
                }
              </p>
            </div>
          </div>

          {/* Current ingredients */}
          <div className="space-y-4">
            <h4 className="font-medium">Состав блюда</h4>
            
            {recipeIngredients.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Ингредиенты не добавлены
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead className="text-right">Цена/ед.</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeIngredients.map(ri => (
                    <TableRow key={ri.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getItemType(ri) === 'semi_finished' && (
                            <Badge variant="secondary" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Заготовка
                            </Badge>
                          )}
                          {getItemName(ri)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ri.quantity} {getItemUnit(ri)}
                      </TableCell>
                      <TableCell className="text-right">
                        {getItemCostPerUnit(ri).toFixed(0)} ֏
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(Number(ri.quantity) * getItemCostPerUnit(ri)).toFixed(0)} ֏
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
                  <TableRow className="font-bold">
                    <TableCell colSpan={3}>Итого себестоимость</TableCell>
                    <TableCell className="text-right">
                      {calculateRecipeCost().toFixed(0)} ֏
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          {/* Add ingredient or semi-finished */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Добавить в состав</h4>
            
            <Tabs value={addType} onValueChange={(v) => setAddType(v as 'ingredient' | 'semi_finished')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ingredient">Ингредиент</TabsTrigger>
                <TabsTrigger value="semi_finished">Заготовка</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ingredient" className="mt-4">
                <div className="flex gap-2">
                  <Select value={newIngredientId} onValueChange={setNewIngredientId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Выберите ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients
                        .filter(ing => !recipeIngredients.some(ri => ri.ingredient_id === ing.id))
                        .map(ing => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({Number(ing.cost_per_unit).toFixed(0)} ֏/{(ing as any).unit?.abbreviation})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <CreateIngredientDialog
                    units={units}
                    onCreated={(newIng) => {
                      fetchData();
                      setNewIngredientId(newIng.id);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={newIngredientQty}
                    onChange={(e) => setNewIngredientQty(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={addIngredientToRecipe}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="semi_finished" className="mt-4">
                <div className="flex gap-2">
                  <Select value={newSemiFinishedId} onValueChange={setNewSemiFinishedId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Выберите заготовку" />
                    </SelectTrigger>
                    <SelectContent>
                      {semiFinished
                        .filter(sf => !recipeIngredients.some(ri => ri.semi_finished_id === sf.id))
                        .map(sf => (
                          <SelectItem key={sf.id} value={sf.id}>
                            {sf.name} ({Number(sf.calculated_cost || 0).toFixed(0)} ֏/{sf.unit?.abbreviation})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={newIngredientQty}
                    onChange={(e) => setNewIngredientQty(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={addIngredientToRecipe}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {semiFinished.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Нет доступных заготовок. Создайте их на странице "Заготовки".
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipeDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <RecipeImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        menuItems={menuItems}
        ingredients={ingredients}
        onImportComplete={fetchData}
      />
    </div>
  );
}
