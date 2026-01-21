import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Users, Key, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type Profile = Tables<'profiles'>;
type Location = Tables<'locations'>;
type UserRole = Tables<'user_roles'>;

interface StaffMember extends Profile {
  location?: Location;
  user_role?: UserRole;
}

export default function StaffPage() {
  const { session } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    location_id: '',
    hourly_rate: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    pin: '',
  });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);

  // PIN dialog
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinMember, setPinMember] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location_id: '',
    hourly_rate: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: profiles }, { data: locs }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*, location:locations(*)').order('full_name'),
        supabase.from('locations').select('*').eq('is_active', true),
        supabase.from('user_roles').select('*'),
      ]);

      // Merge roles with profiles
      const staffWithRoles = (profiles || []).map(profile => {
        const role = roles?.find(r => r.user_id === profile.id);
        return { ...profile, user_role: role };
      });

      setStaff(staffWithRoles as StaffMember[]);
      setLocations(locs || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (member: StaffMember) => {
    setEditMember(member);
    setFormData({
      full_name: member.full_name,
      phone: member.phone || '',
      location_id: member.location_id || '',
      hourly_rate: member.hourly_rate?.toString() || '',
      role: (member.user_role?.role as any) || 'cashier',
      is_active: member.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editMember) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          location_id: formData.location_id || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
          is_active: formData.is_active,
        })
        .eq('id', editMember.id);

      if (profileError) throw profileError;

      // Update or insert role
      if (editMember.user_role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('id', editMember.user_role.id);
        
        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: editMember.id, role: formData.role });
        
        if (roleError) throw roleError;
      }

      toast.success('Сотрудник обновлён');
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const openPinDialog = (member: StaffMember) => {
    setPinMember(member);
    setNewPin('');
    setPinDialogOpen(true);
  };

  const handleSetPin = async () => {
    if (!pinMember || !newPin) {
      toast.error('Введите PIN-код');
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      toast.error('PIN должен состоять из 4 цифр');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('hash-pin', {
        body: { pin: newPin, user_id: pinMember.id },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      toast.success('PIN-код установлен');
      setPinDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Ошибка установки PIN');
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge>Админ</Badge>;
      case 'manager':
        return <Badge variant="secondary">Менеджер</Badge>;
      case 'cashier':
        return <Badge variant="outline">Кассир</Badge>;
      default:
        return <Badge variant="outline">Не назначена</Badge>;
    }
  };

  const filteredStaff = staff.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const openCreateDialog = () => {
    setCreateForm({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      location_id: locations[0]?.id || '',
      hourly_rate: '',
      role: 'cashier',
      pin: '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateStaff = async () => {
    if (!createForm.full_name || !createForm.email || !createForm.password) {
      toast.error('Заполните обязательные поля');
      return;
    }

    if (createForm.pin && !/^\d{4}$/.test(createForm.pin)) {
      toast.error('PIN должен состоять из 4 цифр');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          full_name: createForm.full_name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          location_id: createForm.location_id || null,
          phone: createForm.phone || null,
          hourly_rate: createForm.hourly_rate ? parseFloat(createForm.hourly_rate) : 0,
          pin: createForm.pin || null,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      toast.success('Сотрудник создан');
      setCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Ошибка создания сотрудника');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Персонал</h1>
          <p className="text-muted-foreground">Управление сотрудниками и ролями</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск сотрудника..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Staff table */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Сотрудники не найдены</p>
            <p className="text-sm text-muted-foreground mt-2">
              Новые пользователи появятся здесь после регистрации
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Точка</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Ставка</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map(member => (
                <TableRow key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{getRoleBadge(member.user_role?.role)}</TableCell>
                  <TableCell>
                    {member.location ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {member.location.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{member.phone || '—'}</TableCell>
                  <TableCell>
                    {member.pin_hash ? (
                      <span className="text-green-500 text-sm">Установлен</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Нет</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.hourly_rate ? `₽${Number(member.hourly_rate)}/ч` : '—'}
                  </TableCell>
                  <TableCell>
                    {member.is_active ? (
                      <span className="text-green-500 text-sm">Активен</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Отключён</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openPinDialog(member)} title="Установить PIN">
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
            <DialogDescription>Измените данные сотрудника</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="cashier">Кассир</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Точка</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите точку" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Ставка (₽/час)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Активен</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Установить PIN-код</DialogTitle>
            <DialogDescription>
              PIN для быстрого входа кассира: {pinMember?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN-код (4 цифры)</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              PIN-код будет захеширован и безопасно сохранён
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSetPin}>Установить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый сотрудник</DialogTitle>
            <DialogDescription>Создайте аккаунт для нового сотрудника</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="ivan@resto.ru"
                />
              </div>
              <div className="space-y-2">
                <Label>Пароль *</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Роль *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v: any) => setCreateForm({ ...createForm, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="cashier">Кассир</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Точка</Label>
                <Select
                  value={createForm.location_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+7..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ставка (₽/час)</Label>
                <Input
                  type="number"
                  value={createForm.hourly_rate}
                  onChange={(e) => setCreateForm({ ...createForm, hourly_rate: e.target.value })}
                  placeholder="200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>PIN-код (для кассира)</Label>
              <Input
                maxLength={4}
                value={createForm.pin}
                onChange={(e) => setCreateForm({ ...createForm, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="4 цифры"
                className="text-center tracking-widest"
              />
              <p className="text-xs text-muted-foreground">Необязательно. Можно установить позже.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateStaff} disabled={creating}>
              {creating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
