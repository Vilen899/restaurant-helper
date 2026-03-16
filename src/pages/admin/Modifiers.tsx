import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Settings2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  ingredient_id: string | null;
  ingredient_quantity: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string | null;
}

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ModifierGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', min_select: '0', max_select: '1', is_active: true });

  // Modifier dialog
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [editMod, setEditMod] = useState<Modifier | null>(null);
  const [modGroupId, setModGroupId] = useState('');
  const [modForm, setModForm] = useState({ name: '', price_adjustment: '0', ingredient_id: '', ingredient_quantity: '0', is_active: true });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: g }, { data: m }, { data: ings }] = await Promise.all([
      supabase.from('modifier_groups').select('*').order('sort_order'),
      supabase.from('modifiers').select('*').order('sort_order'),
      supabase.from('ingredients').select('id, name, unit').eq('is_active', true).order('name'),
    ]);
    setGroups(g || []);
    setModifiers(m || []);
    setIngredients(ings || []);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group CRUD
  const openGroupDialog = (group?: ModifierGroup) => {
    setEditGroup(group || null);
    setGroupForm({
      name: group?.name || '',
      min_select: String(group?.min_select ?? 0),
      max_select: String(group?.max_select ?? 1),
      is_active: group?.is_active ?? true,
    });
    setGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) { toast.error('Укажите название'); return; }
    const data = {
      name: groupForm.name.trim(),
      min_select: parseInt(groupForm.min_select) || 0,
      max_select: parseInt(groupForm.max_select) || 1,
      is_active: groupForm.is_active,
      sort_order: editGroup ? editGroup.sort_order : groups.length * 10,
    };
    try {
      if (editGroup) {
        const { error } = await supabase.from('modifier_groups').update(data).eq('id', editGroup.id);
        if (error) throw error;
        toast.success('Группа обновлена');
      } else {
        const { error } = await supabase.from('modifier_groups').insert(data);
        if (error) throw error;
        toast.success('Группа добавлена');
      }
      setGroupDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Удалить группу со всеми модификаторами?')) return;
    const { error } = await supabase.from('modifier_groups').delete().eq('id', id);
    if (error) { toast.error('Ошибка удаления'); return; }
    toast.success('Группа удалена');
    fetchData();
  };

  // Modifier CRUD
  const openModDialog = (groupId: string, mod?: Modifier) => {
    setModGroupId(groupId);
    setEditMod(mod || null);
    setModForm({
      name: mod?.name || '',
      price_adjustment: String(mod?.price_adjustment ?? 0),
      ingredient_id: mod?.ingredient_id || '',
      ingredient_quantity: String(mod?.ingredient_quantity ?? 0),
      is_active: mod?.is_active ?? true,
    });
    setModDialogOpen(true);
  };

  const saveMod = async () => {
    if (!modForm.name.trim()) { toast.error('Укажите название'); return; }
    const groupMods = modifiers.filter(m => m.group_id === modGroupId);
    const data = {
      group_id: modGroupId,
      name: modForm.name.trim(),
      price_adjustment: parseFloat(modForm.price_adjustment) || 0,
      ingredient_id: modForm.ingredient_id || null,
      ingredient_quantity: parseFloat(modForm.ingredient_quantity) || 0,
      is_active: modForm.is_active,
      sort_order: editMod ? editMod.sort_order : groupMods.length * 10,
    };
    try {
      if (editMod) {
        const { error } = await supabase.from('modifiers').update(data).eq('id', editMod.id);
        if (error) throw error;
        toast.success('Модификатор обновлён');
      } else {
        const { error } = await supabase.from('modifiers').insert(data);
        if (error) throw error;
        toast.success('Модификатор добавлен');
      }
      setModDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
  };

  const deleteMod = async (id: string) => {
    if (!confirm('Удалить модификатор?')) return;
    const { error } = await supabase.from('modifiers').delete().eq('id', id);
    if (error) { toast.error('Ошибка удаления'); return; }
    toast.success('Модификатор удалён');
    fetchData();
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    modifiers.some(m => m.group_id === g.id && m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Модификаторы</h1>
          <p className="text-muted-foreground">Группы модификаторов и варианты для блюд</p>
        </div>
        <Button onClick={() => openGroupDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Новая группа
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Модификаторы не найдены</p>
            <Button variant="outline" className="mt-4" onClick={() => openGroupDialog()}>
              Создать первую группу
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const groupMods = modifiers.filter(m => m.group_id === group.id);
            const isExpanded = expandedGroups.has(group.id);
            return (
              <Card key={group.id} className={!group.is_active ? 'opacity-60' : ''}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-2 text-left" onClick={() => toggleExpand(group.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <span className="font-semibold text-lg">{group.name}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {group.min_select > 0 ? `Обязательно (мин ${group.min_select})` : 'Опционально'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Макс: {group.max_select}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {groupMods.length} вариант(ов)
                          </Badge>
                        </div>
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openModDialog(group.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openGroupDialog(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4">
                      {groupMods.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Нет вариантов. <button className="text-primary underline" onClick={() => openModDialog(group.id)}>Добавить</button>
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Название</TableHead>
                              <TableHead>Доплата</TableHead>
                              <TableHead>Ингредиент</TableHead>
                              <TableHead>Кол-во списания</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupMods.map(mod => (
                              <TableRow key={mod.id} className={!mod.is_active ? 'opacity-50' : ''}>
                                <TableCell className="font-medium">{mod.name}</TableCell>
                                <TableCell>
                                  {Number(mod.price_adjustment) > 0 ? (
                                    <span className="text-green-600">+{Number(mod.price_adjustment).toLocaleString()} ֏</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {mod.ingredient_id ? (
                                    <div className="flex items-center gap-1">
                                      <Package className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{ingredients.find(i => i.id === mod.ingredient_id)?.name || '—'}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {Number(mod.ingredient_quantity) > 0 ? mod.ingredient_quantity : '—'}
                                </TableCell>
                                <TableCell>
                                  {mod.is_active ? (
                                    <span className="text-green-500 text-sm">Активен</span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">Скрыт</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openModDialog(group.id, mod)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteMod(mod.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Group dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGroup ? 'Редактировать группу' : 'Новая группа модификаторов'}</DialogTitle>
            <DialogDescription>
              Группа объединяет связанные модификаторы (например: размер, соус)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Размер порции" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Мин. выбор</Label>
                <Input type="number" min="0" value={groupForm.min_select} onChange={e => setGroupForm({ ...groupForm, min_select: e.target.value })} />
                <p className="text-xs text-muted-foreground">0 = опционально, 1+ = обязательно</p>
              </div>
              <div className="space-y-2">
                <Label>Макс. выбор</Label>
                <Input type="number" min="1" value={groupForm.max_select} onChange={e => setGroupForm({ ...groupForm, max_select: e.target.value })} />
                <p className="text-xs text-muted-foreground">1 = одиночный, 2+ = множественный</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Активна</Label>
              <Switch checked={groupForm.is_active} onCheckedChange={v => setGroupForm({ ...groupForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveGroup}>{editGroup ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMod ? 'Редактировать модификатор' : 'Новый модификатор'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={modForm.name} onChange={e => setModForm({ ...modForm, name: e.target.value })} placeholder="Большой" />
            </div>
            <div className="space-y-2">
              <Label>Доплата (֏)</Label>
              <Input type="number" value={modForm.price_adjustment} onChange={e => setModForm({ ...modForm, price_adjustment: e.target.value })} placeholder="0" />
              <p className="text-xs text-muted-foreground">0 = без доплаты</p>
            </div>
            <div className="space-y-2">
              <Label>Списание со склада (ингредиент)</Label>
              <Select value={modForm.ingredient_id} onValueChange={v => setModForm({ ...modForm, ingredient_id: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Без списания" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без списания</SelectItem>
                  {ingredients.map(ing => (
                    <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {modForm.ingredient_id && (
              <div className="space-y-2">
                <Label>Количество списания</Label>
                <Input type="number" step="0.001" value={modForm.ingredient_quantity} onChange={e => setModForm({ ...modForm, ingredient_quantity: e.target.value })} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Активен</Label>
              <Switch checked={modForm.is_active} onCheckedChange={v => setModForm({ ...modForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveMod}>{editMod ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
