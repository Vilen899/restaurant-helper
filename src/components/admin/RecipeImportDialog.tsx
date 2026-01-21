import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface MenuItem {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
}

interface ParsedRecipe {
  menuItemName: string;
  menuItemId?: string;
  ingredients: {
    ingredientName: string;
    ingredientId?: string;
    quantity: number;
    matched: boolean;
  }[];
  matched: boolean;
}

interface RecipeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  onImportComplete: () => void;
}

export function RecipeImportDialog({
  open,
  onOpenChange,
  menuItems,
  ingredients,
  onImportComplete,
}: RecipeImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');

  const normalizeString = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const findMenuItemMatch = (name: string): MenuItem | undefined => {
    const normalized = normalizeString(name);
    return menuItems.find(item => {
      const itemNormalized = normalizeString(item.name);
      return itemNormalized === normalized || 
             itemNormalized.includes(normalized) || 
             normalized.includes(itemNormalized);
    });
  };

  const findIngredientMatch = (name: string): Ingredient | undefined => {
    const normalized = normalizeString(name);
    return ingredients.find(ing => {
      const ingNormalized = normalizeString(ing.name);
      return ingNormalized === normalized || 
             ingNormalized.includes(normalized) || 
             normalized.includes(ingNormalized);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Parse recipes from Excel
      // Expected format:
      // Row 1: Headers (Menu Item, Ingredient, Quantity)
      // OR grouped format where menu item is in first column, ingredients follow
      
      const recipes: ParsedRecipe[] = [];
      let currentRecipe: ParsedRecipe | null = null;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const menuItemName = row[0]?.toString()?.trim();
        const ingredientName = row[1]?.toString()?.trim();
        const quantity = parseFloat(row[2]?.toString() || '0');

        if (menuItemName && ingredientName && quantity > 0) {
          // Find or create recipe for this menu item
          let recipe = recipes.find(r => r.menuItemName === menuItemName);
          
          if (!recipe) {
            const matchedItem = findMenuItemMatch(menuItemName);
            recipe = {
              menuItemName,
              menuItemId: matchedItem?.id,
              ingredients: [],
              matched: !!matchedItem,
            };
            recipes.push(recipe);
          }

          const matchedIngredient = findIngredientMatch(ingredientName);
          recipe.ingredients.push({
            ingredientName,
            ingredientId: matchedIngredient?.id,
            quantity,
            matched: !!matchedIngredient,
          });
        }
      }

      setParsedRecipes(recipes);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Ошибка чтения файла. Проверьте формат.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRecipes = parsedRecipes.filter(r => r.matched);
    if (validRecipes.length === 0) {
      toast.error('Нет рецептов для импорта');
      return;
    }

    setImporting(true);
    setStep('importing');
    setProgress(0);

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < validRecipes.length; i++) {
      const recipe = validRecipes[i];
      const validIngredients = recipe.ingredients.filter(ing => ing.matched && ing.ingredientId);

      for (const ing of validIngredients) {
        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from('menu_item_ingredients')
            .select('id')
            .eq('menu_item_id', recipe.menuItemId!)
            .eq('ingredient_id', ing.ingredientId!)
            .maybeSingle();

          if (existing) {
            // Update existing
            await supabase
              .from('menu_item_ingredients')
              .update({ quantity: ing.quantity })
              .eq('id', existing.id);
          } else {
            // Insert new
            await supabase
              .from('menu_item_ingredients')
              .insert({
                menu_item_id: recipe.menuItemId!,
                ingredient_id: ing.ingredientId!,
                quantity: ing.quantity,
              });
          }
          imported++;
        } catch (error) {
          console.error('Error importing:', error);
          failed++;
        }
      }

      setProgress(Math.round(((i + 1) / validRecipes.length) * 100));
    }

    setImporting(false);
    setStep('done');
    toast.success(`Импортировано ${imported} связей. Ошибок: ${failed}`);
    onImportComplete();
  };

  const handleClose = () => {
    setParsedRecipes([]);
    setStep('upload');
    setProgress(0);
    onOpenChange(false);
  };

  const matchedRecipes = parsedRecipes.filter(r => r.matched);
  const unmatchedRecipes = parsedRecipes.filter(r => !r.matched);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт рецептов из Excel
          </DialogTitle>
          <DialogDescription>
            Загрузите Excel файл с рецептами. Формат: Блюдо | Ингредиент | Количество
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="py-12 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div 
                className="border-2 border-dashed rounded-xl p-12 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Нажмите для выбора файла</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Поддерживаются форматы .xlsx и .xls
                </p>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg text-left text-sm">
                <p className="font-medium mb-2">Формат файла:</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Блюдо</th>
                      <th className="text-left py-1">Ингредиент</th>
                      <th className="text-left py-1">Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1">Americano</td>
                      <td className="py-1">Espresso Coffee</td>
                      <td className="py-1">0.014</td>
                    </tr>
                    <tr>
                      <td className="py-1">Americano</td>
                      <td className="py-1">Bonaqua Water</td>
                      <td className="py-1">0.2</td>
                    </tr>
                    <tr>
                      <td className="py-1">Caesar Salad</td>
                      <td className="py-1">Chicken Breast</td>
                      <td className="py-1">0.15</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {/* Summary */}
                <div className="flex gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">
                      <strong>{matchedRecipes.length}</strong> блюд найдено
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm">
                      <strong>{unmatchedRecipes.length}</strong> не найдено
                    </span>
                  </div>
                </div>

                {/* Matched recipes */}
                {matchedRecipes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">Готово к импорту</h4>
                    <div className="space-y-2">
                      {matchedRecipes.map((recipe, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{recipe.menuItemName}</span>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {recipe.ingredients.filter(i => i.matched).length} ингр.
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {recipe.ingredients.map((ing, iIdx) => (
                              <Badge 
                                key={iIdx} 
                                variant={ing.matched ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {ing.ingredientName} ({ing.quantity})
                                {!ing.matched && <X className="h-3 w-3 ml-1" />}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched recipes */}
                {unmatchedRecipes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-amber-600">Блюда не найдены (пропущены)</h4>
                    <div className="space-y-1">
                      {unmatchedRecipes.map((recipe, idx) => (
                        <div key={idx} className="p-2 bg-amber-500/10 rounded text-sm">
                          {recipe.menuItemName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="font-medium mb-4">Импорт рецептов...</p>
              <Progress value={progress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-medium">Импорт завершён!</p>
              <p className="text-muted-foreground mt-2">
                Рецепты успешно добавлены. Себестоимость блюд пересчитана.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Назад
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={matchedRecipes.length === 0}
              >
                Импортировать {matchedRecipes.length} рецептов
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={handleClose}>
              Закрыть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
