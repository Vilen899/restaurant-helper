import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Unit = Tables<'units'>;

interface CreateIngredientDialogProps {
  units: Unit[];
  onCreated: (ingredient: { id: string; name: string }) => void;
  trigger?: React.ReactNode;
}

export function CreateIngredientDialog({ units, onCreated, trigger }: CreateIngredientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit_id: '',
    cost_per_unit: '',
  });

  useEffect(() => {
    if (open && units.length > 0 && !formData.unit_id) {
      // Default to first unit (usually grams or pieces)
      const defaultUnit = units.find(u => u.abbreviation === 'г' || u.abbreviation === 'шт') || units[0];
      setFormData(prev => ({ ...prev, unit_id: defaultUnit?.id || '' }));
    }
  }, [open, units, formData.unit_id]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название ингредиента');
      return;
    }
    if (!formData.unit_id) {
      toast.error('Выберите единицу измерения');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: formData.name.trim(),
          unit_id: formData.unit_id,
          cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Ингредиент "${formData.name}" создан`);
      onCreated({ id: data.id, name: data.name });
      setOpen(false);
      setFormData({ name: '', unit_id: '', cost_per_unit: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка создания ингредиента');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Новый
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать ингредиент</DialogTitle>
          <DialogDescription>
            Добавьте новый ингредиент, которого нет в списке
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input
              placeholder="Например: Сыр моцарелла"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Единица измерения *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(v) => setFormData({ ...formData, unit_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Цена за единицу</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
