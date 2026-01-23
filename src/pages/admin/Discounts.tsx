import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Percent, Hash, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Discount = Tables<'discounts'>;

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percent',
    value: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки скидок');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      discount_type: 'percent',
      value: '',
      is_active: true,
      sort_order: discounts.length,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingId(discount.id);
    setFormData({
      name: discount.name,
      discount_type: discount.discount_type,
      value: String(discount.value),
      is_active: discount.is_active,
      sort_order: discount.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название скидки');
      return;
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast.error('Введите значение скидки');
      return;
    }

    // Для процентов проверяем диапазон
    if (formData.discount_type === 'percent' && parseFloat(formData.value) > 100) {
      toast.error('Процент скидки не может быть больше 100');
      return;
    }

    try {
      const discountData = {
        name: formData.name.trim(),
        discount_type: formData.discount_type,
        value: parseFloat(formData.value),
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      if (editingId) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Скидка обновлена');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert(discountData);

        if (error) throw error;
        toast.success('Скидка создана');
      }

      setDialogOpen(false);
      fetchDiscounts();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      
      setDiscounts(prev =>
        prev.map(d => d.id === id ? { ...d, is_active: !currentState } : d)
      );
      toast.success(!currentState ? 'Скидка активирована' : 'Скидка деактивирована');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка обновления');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить скидку "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Скидка удалена');
      fetchDiscounts();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discount_type === 'percent') {
      return `${discount.value}%`;
    }
    return `${Number(discount.value).toLocaleString()} ֏`;
  };

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
          <h1 className="text-3xl font-bold">Скидки</h1>
          <p className="text-muted-foreground">Управление скидками для кассы</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Новая скидка
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="text-right">Значение</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Нет скидок. Создайте первую!
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{discount.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {discount.discount_type === 'percent' ? (
                        <>
                          <Percent className="h-3 w-3" />
                          Процент
                        </>
                      ) : (
                        <>
                          <Hash className="h-3 w-3" />
                          Фиксированная
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDiscountValue(discount)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={discount.is_active}
                      onCheckedChange={() => toggleActive(discount.id, discount.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(discount)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(discount.id, discount.name)}
                      >
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
            <DialogTitle>
              {editingId ? 'Редактировать скидку' : 'Новая скидка'}
            </DialogTitle>
            <DialogDescription>
              Настройте параметры скидки для использования на кассе
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                placeholder="Например: Скидка сотрудника"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип скидки *</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Процент (%)
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Фиксированная (֏)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Значение * {formData.discount_type === 'percent' ? '(%)' : '(֏)'}
                </Label>
                <Input
                  type="number"
                  placeholder={formData.discount_type === 'percent' ? '10' : '500'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  min="0"
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
