import { useState, useEffect } from 'react';
import { Search, Package, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Inventory = Tables<'inventory'>;
type Ingredient = Tables<'ingredients'>;
type Location = Tables<'locations'>;
type Unit = Tables<'units'>;

interface InventoryItem extends Inventory {
  ingredient?: Ingredient & { unit?: Unit };
  location?: Location;
}

type StockStatus = 'ok' | 'low' | 'out';

interface InventoryReportItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit_abbr: string;
  location_id: string;
  location_name: string;
  quantity: number;
  min_stock: number;
  status: StockStatus;
}

export default function InventoryReportPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: inv }, { data: locs }] = await Promise.all([
        supabase.from('inventory').select('*, ingredient:ingredients(*, unit:units(*)), location:locations(*)'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
      ]);

      setInventory((inv as InventoryItem[]) || []);
      setLocations(locs || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (quantity: number, minStock: number): StockStatus => {
    if (quantity <= 0) return 'out';
    if (minStock > 0 && quantity < minStock) return 'low';
    return 'ok';
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'ok':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            В норме
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Мало
          </Badge>
        );
      case 'out':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Нет
          </Badge>
        );
    }
  };

  // Transform inventory to report items
  const reportItems: InventoryReportItem[] = inventory.map(item => ({
    id: item.id,
    ingredient_id: item.ingredient_id,
    ingredient_name: item.ingredient?.name || '—',
    unit_abbr: item.ingredient?.unit?.abbreviation || '',
    location_id: item.location_id,
    location_name: item.location?.name || '—',
    quantity: Number(item.quantity),
    min_stock: Number(item.ingredient?.min_stock || 0),
    status: getStatus(Number(item.quantity), Number(item.ingredient?.min_stock || 0)),
  }));

  // Filter items
  const filteredItems = reportItems.filter(item => {
    const matchesSearch = item.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || item.location_id === selectedLocation;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesLocation && matchesStatus;
  });

  // Sort: out first, then low, then ok
  const sortedItems = [...filteredItems].sort((a, b) => {
    const statusOrder = { out: 0, low: 1, ok: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Stats
  const stats = {
    total: reportItems.length,
    ok: reportItems.filter(i => i.status === 'ok').length,
    low: reportItems.filter(i => i.status === 'low').length,
    out: reportItems.filter(i => i.status === 'out').length,
  };

  const exportToCSV = () => {
    const headers = ['Ингредиент', 'Локация', 'Количество', 'Единица', 'Мин. остаток', 'Статус'];
    const rows = sortedItems.map(item => [
      item.ingredient_name,
      item.location_name,
      item.quantity.toString(),
      item.unit_abbr,
      item.min_stock.toString(),
      item.status === 'ok' ? 'В норме' : item.status === 'low' ? 'Мало' : 'Нет',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Отчёт экспортирован');
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
          <h1 className="text-3xl font-bold">Отчёт по остаткам</h1>
          <p className="text-muted-foreground">Текущее состояние склада по всем локациям</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Всего позиций</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              В норме
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.ok}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Мало
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">{stats.low}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-destructive" />
              Нет в наличии
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.out}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск ингредиента..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Локация" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все локации</SelectItem>
            {locations.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="ok">В норме</SelectItem>
            <SelectItem value="low">Мало</SelectItem>
            <SelectItem value="out">Нет в наличии</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {sortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет данных по заданным фильтрам</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ингредиент</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead className="text-right">Количество</TableHead>
                <TableHead className="text-right">Мин. остаток</TableHead>
                <TableHead className="text-center">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map(item => (
                <TableRow key={item.id} className={item.status === 'out' ? 'bg-destructive/5' : item.status === 'low' ? 'bg-amber-500/5' : ''}>
                  <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                  <TableCell>{item.location_name}</TableCell>
                  <TableCell className="text-right">
                    {item.quantity.toFixed(2)} {item.unit_abbr}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.min_stock > 0 ? `${item.min_stock} ${item.unit_abbr}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}