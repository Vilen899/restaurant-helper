import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Banknote, CreditCard, Wallet, Smartphone, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/admin/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type PaymentMethod = Tables<'payment_methods'>;

const iconOptions = [
  { value: 'Banknote', label: 'Наличные', icon: Banknote },
  { value: 'CreditCard', label: 'Карта', icon: CreditCard },
  { value: 'Wallet', label: 'Кошелек', icon: Wallet },
  { value: 'Smartphone', label: 'Телефон', icon: Smartphone },
  { value: 'QrCode', label: 'QR код', icon: QrCode },
];

const getIconComponent = (iconName: string | null) => {
  const found = iconOptions.find(o => o.value === iconName);
  return found?.icon || Banknote;
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    icon: 'Banknote',
    is_active: true,
  });

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки способов оплаты');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingMethod(null);
    setFormData({ name: '', code: '', icon: 'Banknote', is_active: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      code: method.code,
      icon: method.icon || 'Banknote',
      is_active: method.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            name: formData.name,
            code: formData.code,
            icon: formData.icon,
            is_active: formData.is_active,
          })
          .eq('id', editingMethod.id);
        
        if (error) throw error;
        toast.success('Способ оплаты обновлен');
      } else {
        const maxSort = Math.max(0, ...methods.map(m => m.sort_order));
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            name: formData.name,
            code: formData.code,
            icon: formData.icon,
            is_active: formData.is_active,
            sort_order: maxSort + 1,
          });
        
        if (error) throw error;
        toast.success('Способ оплаты добавлен');
      }

      setDialogOpen(false);
      fetchMethods();
    } catch (error: any) {
      console.error('Error:', error);
      if (error.code === '23505') {
        toast.error('Такой код уже существует');
      } else {
        toast.error('Ошибка сохранения');
      }
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (!confirm(`Удалить способ оплаты "${method.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', method.id);
      
      if (error) throw error;
      toast.success('Способ оплаты удален');
      fetchMethods();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !method.is_active })
        .eq('id', method.id);
      
      if (error) throw error;
      fetchMethods();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка обновления');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Способы оплаты"
        description="Управление доступными способами оплаты для кассы"
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => {
          const IconComp = getIconComponent(method.icon);
          return (
            <Card key={method.id} className={!method.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{method.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Код: {method.code}</p>
                    </div>
                  </div>
                  <Switch
                    checked={method.is_active}
                    onCheckedChange={() => handleToggleActive(method)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(method)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(method)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {methods.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Нет способов оплаты</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Добавить первый способ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Редактировать способ оплаты' : 'Новый способ оплаты'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Наличные"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Код (уникальный)</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="Например: cash"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Иконка</Label>
              <Select
                value={formData.icon}
                onValueChange={(v) => setFormData({ ...formData, icon: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label htmlFor="is_active">Активен</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              {editingMethod ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
