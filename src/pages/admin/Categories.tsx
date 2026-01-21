import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type MenuCategory = Tables<'menu_categories'>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuCategory | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sort_order: '0',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order');

      setCategories(data || []);
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
      sort_order: ((categories.length + 1) * 10).toString(),
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: MenuCategory) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      sort_order: item.sort_order.toString(),
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Укажите название категории');
      return;
    }

    const data = {
      name: formData.name,
      sort_order: parseInt(formData.sort_order) || 0,
      is_active: formData.is_active,
    };

    try {
      if (editItem) {
        const { error } = await supabase
          .from('menu_categories')
          .update(data)
          .eq('id', editItem.id);

        if (error) throw error;
        toast.success('Категория обновлена');
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert(data);

        if (error) throw error;
        toast.success('Категория добавлена');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту категорию?')) return;

    try {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Категория удалена');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления. Возможно категория содержит блюда.');
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Категории меню</h1>
          <p className="text-muted-foreground">Группировка блюд по категориям</p>
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
          placeholder="Поиск категории..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories table */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Категории не найдены</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              Добавить первую категорию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Порядок</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map(cat => (
                <TableRow key={cat.id} className={!cat.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-muted-foreground">
                    {cat.sort_order}
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    {cat.is_active ? (
                      <span className="text-green-500 text-sm">Активна</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Скрыта</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
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
            <DialogTitle>{editItem ? 'Редактировать категорию' : 'Добавить категорию'}</DialogTitle>
            <DialogDescription>
              Категории используются для группировки блюд в меню
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Салаты"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Порядок сортировки</Label>
              <Input
                id="order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                placeholder="10"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Активна</Label>
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
