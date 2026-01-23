import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed, Upload, Image } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { PageHeader, ActionButton } from '@/components/admin/PageHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { StatCard } from '@/components/admin/StatCard';

type MenuItem = Tables<'menu_items'>;
type MenuCategory = Tables<'menu_categories'>;

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    output_weight: '',
    is_active: true,
    image_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: items }, { data: cats }] = await Promise.all([
        supabase.from('menu_items').select('*').order('sort_order'),
        supabase.from('menu_categories').select('*').order('sort_order'),
      ]);

      setMenuItems(items || []);
      setCategories(cats || []);
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
      description: '',
      price: '',
      category_id: categories[0]?.id || '',
      output_weight: '',
      is_active: true,
      image_url: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      output_weight: item.output_weight?.toString() || '',
      is_active: item.is_active,
      image_url: (item as any).image_url || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category_id: formData.category_id,
      output_weight: formData.output_weight ? parseFloat(formData.output_weight) : null,
      is_active: formData.is_active,
      image_url: formData.image_url || null,
    };

    try {
      if (editItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(data)
          .eq('id', editItem.id);

        if (error) throw error;
        toast.success('Блюдо обновлено');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(data);

        if (error) throw error;
        toast.success('Блюдо добавлено');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это блюдо?')) return;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Блюдо удалено');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка удаления');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Без категории';
  };

  const activeItems = menuItems.filter(i => i.is_active).length;
  const totalRevenue = menuItems.reduce((sum, i) => sum + Number(i.price), 0);
  const avgPrice = menuItems.length ? totalRevenue / menuItems.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Меню"
        description="Управление блюдами и позициями"
        onRefresh={fetchData}
        loading={loading}
        actions={
          <ActionButton label="Добавить блюдо" icon={Plus} onClick={openCreateDialog} />
        }
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всего позиций" value={menuItems.length} icon={UtensilsCrossed} />
        <StatCard title="Активных" value={activeItems} icon={UtensilsCrossed} variant="success" />
        <StatCard title="Категорий" value={categories.length} icon={UtensilsCrossed} variant="info" />
        <StatCard title="Средняя цена" value={`₽${Math.round(avgPrice)}`} icon={UtensilsCrossed} />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Поиск по названию..."
      >
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>
      {/* Menu items grid */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Блюда не найдены</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              Добавить первое блюдо
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{getCategoryName(item.category_id)}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">₽ {Number(item.price).toLocaleString('ru-RU')}</p>
                    {Number(item.cost_price) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Себестоимость: ₽ {Number(item.cost_price).toLocaleString('ru-RU')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {item.output_weight && (
                      <Badge variant="outline">{item.output_weight} г</Badge>
                    )}
                    {!item.is_active && (
                      <Badge variant="secondary" className="ml-2">Скрыто</Badge>
                    )}
                  </div>
                </div>
                {Number(item.cost_price) > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Наценка: {Math.round((Number(item.price) - Number(item.cost_price)) / Number(item.cost_price) * 100)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Редактировать блюдо' : 'Добавить блюдо'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Измените данные блюда' : 'Заполните информацию о новом блюде'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Цезарь с курицей"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Салат с куриным филе, сыром пармезан..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Цена (₽) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="450"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Выход (г)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.output_weight}
                  onChange={(e) => setFormData({ ...formData, output_weight: e.target.value })}
                  placeholder="280"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Активно в меню</Label>
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
