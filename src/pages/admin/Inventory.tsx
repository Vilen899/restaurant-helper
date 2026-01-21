import { useState, useEffect, useMemo } from 'react';
import { Search, Package, ArrowRightLeft, TrendingDown, AlertTriangle, Plus, Database, ClipboardCheck, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { TablePagination } from '@/components/admin/TablePagination';
import { SortableTableHead } from '@/components/admin/SortableTableHead';
import { useTableSort } from '@/hooks/useTableSort';

type Inventory = Tables<'inventory'>;
type Ingredient = Tables<'ingredients'>;
type Location = Tables<'locations'>;
type Unit = Tables<'units'>;
type Supply = Tables<'supplies'>;
type Transfer = Tables<'transfers'>;
type Stocktaking = Tables<'stocktakings'>;
type StocktakingItem = Tables<'stocktaking_items'>;

interface InventoryItem extends Inventory {
  ingredient?: Ingredient & { unit?: Unit };
  location?: Location;
}

interface SupplyWithLocation extends Supply {
  location?: Location;
}

interface TransferWithLocations extends Transfer {
  from_location?: Location;
  to_location?: Location;
}

interface StocktakingWithLocation extends Stocktaking {
  location?: Location;
}

interface StocktakingItemWithIngredient extends StocktakingItem {
  ingredient?: Ingredient & { unit?: Unit };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<(Ingredient & { unit?: Unit })[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplies, setSupplies] = useState<SupplyWithLocation[]>([]);
  const [transfers, setTransfers] = useState<TransferWithLocations[]>([]);
  const [stocktakings, setStocktakings] = useState<StocktakingWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Stocktaking history filters
  const [stocktakingLocationFilter, setStocktakingLocationFilter] = useState<string>('all');
  const [stocktakingDateFrom, setStocktakingDateFrom] = useState<Date | undefined>(undefined);
  const [stocktakingDateTo, setStocktakingDateTo] = useState<Date | undefined>(undefined);

  // Supplies filters
  const [suppliesLocationFilter, setSuppliesLocationFilter] = useState<string>('all');
  const [suppliesDateFrom, setSuppliesDateFrom] = useState<Date | undefined>(undefined);
  const [suppliesDateTo, setSuppliesDateTo] = useState<Date | undefined>(undefined);

  // Transfers filters
  const [transfersLocationFilter, setTransfersLocationFilter] = useState<string>('all');
  const [transfersDateFrom, setTransfersDateFrom] = useState<Date | undefined>(undefined);
  const [transfersDateTo, setTransfersDateTo] = useState<Date | undefined>(undefined);

  // Pagination state
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(25);
  const [stocktakingsPage, setStocktakingsPage] = useState(1);
  const [stocktakingsPageSize, setStocktakingsPageSize] = useState(10);
  const [suppliesPage, setSuppliesPage] = useState(1);
  const [suppliesPageSize, setSuppliesPageSize] = useState(10);
  const [transfersPage, setTransfersPage] = useState(1);
  const [transfersPageSize, setTransfersPageSize] = useState(10);

  // Supply dialog
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({
    location_id: '',
    supplier_name: '',
    invoice_number: '',
    items: [] as Array<{ ingredient_id: string; quantity: string; cost_per_unit: string }>,
  });

  // Transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_location_id: '',
    to_location_id: '',
    items: [] as Array<{ ingredient_id: string; quantity: string }>,
  });

  // Bulk stock dialog
  const [bulkStockDialogOpen, setBulkStockDialogOpen] = useState(false);
  const [bulkStockForm, setBulkStockForm] = useState({
    location_id: '',
    default_quantity: '100',
    items: [] as Array<{ ingredient_id: string; name: string; quantity: string; selected: boolean }>,
  });

  // Stocktaking (инвентаризация) dialog
  const [stocktakingDialogOpen, setStocktakingDialogOpen] = useState(false);
  const [stocktakingForm, setStocktakingForm] = useState({
    location_id: '',
    items: [] as Array<{
      ingredient_id: string;
      name: string;
      unit_abbr: string;
      system_qty: number;
      actual_qty: string;
      difference: number;
    }>,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        { data: inv },
        { data: ings },
        { data: locs },
        { data: sups },
        { data: trans },
        { data: stocks },
      ] = await Promise.all([
        supabase.from('inventory').select('*, ingredient:ingredients(*, unit:units(*)), location:locations(*)'),
        supabase.from('ingredients').select('*, unit:units(*)').eq('is_active', true).order('name'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
        supabase.from('supplies').select('*, location:locations(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('transfers').select('*, from_location:locations!transfers_from_location_id_fkey(*), to_location:locations!transfers_to_location_id_fkey(*)').order('created_at', { ascending: false }).limit(50),
        supabase.from('stocktakings').select('*, location:locations(*)').order('created_at', { ascending: false }).limit(50),
      ]);

      setInventory((inv as InventoryItem[]) || []);
      setIngredients((ings as any) || []);
      setLocations(locs || []);
      setSupplies((sups as SupplyWithLocation[]) || []);
      setTransfers((trans as TransferWithLocations[]) || []);
      setStocktakings((stocks as StocktakingWithLocation[]) || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openSupplyDialog = () => {
    setSupplyForm({
      location_id: locations[0]?.id || '',
      supplier_name: '',
      invoice_number: '',
      items: [{ ingredient_id: '', quantity: '', cost_per_unit: '' }],
    });
    setSupplyDialogOpen(true);
  };

  const addSupplyItem = () => {
    setSupplyForm(prev => ({
      ...prev,
      items: [...prev.items, { ingredient_id: '', quantity: '', cost_per_unit: '' }],
    }));
  };

  const updateSupplyItem = (index: number, field: string, value: string) => {
    setSupplyForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreateSupply = async () => {
    if (!supplyForm.location_id || supplyForm.items.some(i => !i.ingredient_id || !i.quantity || !i.cost_per_unit)) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const totalAmount = supplyForm.items.reduce(
        (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.cost_per_unit),
        0
      );

      // Create supply
      const { data: supply, error: supplyError } = await supabase
        .from('supplies')
        .insert({
          location_id: supplyForm.location_id,
          supplier_name: supplyForm.supplier_name || null,
          invoice_number: supplyForm.invoice_number || null,
          total_amount: totalAmount,
          status: 'received',
          received_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (supplyError) throw supplyError;

      // Create supply items
      const supplyItems = supplyForm.items.map(item => ({
        supply_id: supply.id,
        ingredient_id: item.ingredient_id,
        quantity: parseFloat(item.quantity),
        cost_per_unit: parseFloat(item.cost_per_unit),
        total_cost: parseFloat(item.quantity) * parseFloat(item.cost_per_unit),
      }));

      await supabase.from('supply_items').insert(supplyItems);

      // Update inventory
      for (const item of supplyForm.items) {
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', supplyForm.location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(existing.quantity) + parseFloat(item.quantity) })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: supplyForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: parseFloat(item.quantity),
            });
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
          location_id: supplyForm.location_id,
          ingredient_id: item.ingredient_id,
          movement_type: 'supply',
          quantity: parseFloat(item.quantity),
          cost_per_unit: parseFloat(item.cost_per_unit),
          reference_id: supply.id,
        });
      }

      toast.success('Поставка оформлена');
      setSupplyDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка оформления поставки');
    }
  };

  const openTransferDialog = () => {
    setTransferForm({
      from_location_id: locations[0]?.id || '',
      to_location_id: locations[1]?.id || '',
      items: [{ ingredient_id: '', quantity: '' }],
    });
    setTransferDialogOpen(true);
  };

  const addTransferItem = () => {
    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, { ingredient_id: '', quantity: '' }],
    }));
  };

  const updateTransferItem = (index: number, field: string, value: string) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.from_location_id || !transferForm.to_location_id || 
        transferForm.from_location_id === transferForm.to_location_id ||
        transferForm.items.some(i => !i.ingredient_id || !i.quantity)) {
      toast.error('Заполните все поля корректно');
      return;
    }

    try {
      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .insert({
          from_location_id: transferForm.from_location_id,
          to_location_id: transferForm.to_location_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const transferItems = transferForm.items.map(item => ({
        transfer_id: transfer.id,
        ingredient_id: item.ingredient_id,
        quantity: parseFloat(item.quantity),
      }));

      await supabase.from('transfer_items').insert(transferItems);

      // Update inventory - subtract from source
      for (const item of transferForm.items) {
        const qty = parseFloat(item.quantity);

        // From location - subtract
        const { data: fromInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', transferForm.from_location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (fromInv) {
          await supabase
            .from('inventory')
            .update({ quantity: Math.max(0, Number(fromInv.quantity) - qty) })
            .eq('id', fromInv.id);
        }

        // To location - add
        const { data: toInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', transferForm.to_location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (toInv) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(toInv.quantity) + qty })
            .eq('id', toInv.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: transferForm.to_location_id,
              ingredient_id: item.ingredient_id,
              quantity: qty,
            });
        }

        // Log movements
        await supabase.from('inventory_movements').insert([
          {
            location_id: transferForm.from_location_id,
            ingredient_id: item.ingredient_id,
            movement_type: 'transfer_out',
            quantity: -qty,
            reference_id: transfer.id,
          },
          {
            location_id: transferForm.to_location_id,
            ingredient_id: item.ingredient_id,
            movement_type: 'transfer_in',
            quantity: qty,
            reference_id: transfer.id,
          },
        ]);
      }

      toast.success('Перемещение оформлено');
      setTransferDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка оформления перемещения');
    }
  };

  // Bulk stock functions
  const openBulkStockDialog = () => {
    setBulkStockForm({
      location_id: locations[0]?.id || '',
      default_quantity: '100',
      items: ingredients.map(ing => ({
        ingredient_id: ing.id,
        name: ing.name,
        quantity: '100',
        selected: true,
      })),
    });
    setBulkStockDialogOpen(true);
  };

  const toggleBulkItem = (ingredientId: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.ingredient_id === ingredientId ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const updateBulkItemQuantity = (ingredientId: string, quantity: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.ingredient_id === ingredientId ? { ...item, quantity } : item
      ),
    }));
  };

  const setAllBulkQuantity = (quantity: string) => {
    setBulkStockForm(prev => ({
      ...prev,
      default_quantity: quantity,
      items: prev.items.map(item => ({ ...item, quantity })),
    }));
  };

  const selectAllBulkItems = (selected: boolean) => {
    setBulkStockForm(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, selected })),
    }));
  };

  const handleBulkStock = async () => {
    const selectedItems = bulkStockForm.items.filter(i => i.selected && parseFloat(i.quantity) > 0);
    if (!bulkStockForm.location_id || selectedItems.length === 0) {
      toast.error('Выберите локацию и хотя бы один ингредиент');
      return;
    }

    try {
      for (const item of selectedItems) {
        const qty = parseFloat(item.quantity);
        const ingredient = ingredients.find(ing => ing.id === item.ingredient_id);
        const costPerUnit = ingredient?.cost_per_unit || 0;

        // Check existing inventory
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', bulkStockForm.location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity: Number(existing.quantity) + qty })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('inventory')
            .insert({
              location_id: bulkStockForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: qty,
            });
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
          location_id: bulkStockForm.location_id,
          ingredient_id: item.ingredient_id,
          movement_type: 'adjustment',
          quantity: qty,
          cost_per_unit: costPerUnit,
          notes: 'Начальное заполнение склада',
        });
      }

      toast.success(`Добавлено ${selectedItems.length} позиций на склад`);
      setBulkStockDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка заполнения склада');
    }
  };

  // Stocktaking functions
  const openStocktakingDialog = () => {
    const locationId = locations[0]?.id || '';
    loadStocktakingItems(locationId);
    setStocktakingDialogOpen(true);
  };

  const loadStocktakingItems = (locationId: string) => {
    const locationInventory = inventory.filter(inv => inv.location_id === locationId);
    
    const items = ingredients.map(ing => {
      const invItem = locationInventory.find(inv => inv.ingredient_id === ing.id);
      const systemQty = invItem ? Number(invItem.quantity) : 0;
      return {
        ingredient_id: ing.id,
        name: ing.name,
        unit_abbr: ing.unit?.abbreviation || '',
        system_qty: systemQty,
        actual_qty: systemQty.toFixed(2),
        difference: 0,
      };
    });

    setStocktakingForm({
      location_id: locationId,
      items,
    });
  };

  const updateStocktakingItem = (ingredientId: string, actualQty: string) => {
    setStocktakingForm(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.ingredient_id === ingredientId) {
          const actual = parseFloat(actualQty) || 0;
          return {
            ...item,
            actual_qty: actualQty,
            difference: actual - item.system_qty,
          };
        }
        return item;
      }),
    }));
  };

  const handleStocktaking = async () => {
    const itemsWithDifference = stocktakingForm.items.filter(item => {
      const actual = parseFloat(item.actual_qty) || 0;
      return Math.abs(actual - item.system_qty) > 0.001;
    });

    if (itemsWithDifference.length === 0) {
      toast.info('Нет расхождений для применения');
      setStocktakingDialogOpen(false);
      return;
    }

    try {
      // Create stocktaking record first
      const { data: stocktakingRecord, error: stocktakingError } = await supabase
        .from('stocktakings')
        .insert({
          location_id: stocktakingForm.location_id,
          total_items: stocktakingForm.items.length,
          items_with_difference: itemsWithDifference.length,
          surplus_count: itemsWithDifference.filter(i => parseFloat(i.actual_qty) - i.system_qty > 0).length,
          shortage_count: itemsWithDifference.filter(i => i.system_qty - parseFloat(i.actual_qty) > 0).length,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (stocktakingError) throw stocktakingError;

      // Save stocktaking items (only those with differences)
      const stocktakingItems = itemsWithDifference.map(item => ({
        stocktaking_id: stocktakingRecord.id,
        ingredient_id: item.ingredient_id,
        system_quantity: item.system_qty,
        actual_quantity: parseFloat(item.actual_qty) || 0,
        difference: (parseFloat(item.actual_qty) || 0) - item.system_qty,
      }));

      if (stocktakingItems.length > 0) {
        await supabase.from('stocktaking_items').insert(stocktakingItems);
      }

      // Update inventory and log movements
      for (const item of itemsWithDifference) {
        const actualQty = parseFloat(item.actual_qty) || 0;
        const difference = actualQty - item.system_qty;

        // Find or create inventory record
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('location_id', stocktakingForm.location_id)
          .eq('ingredient_id', item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity: actualQty })
            .eq('id', existing.id);
        } else if (actualQty > 0) {
          await supabase
            .from('inventory')
            .insert({
              location_id: stocktakingForm.location_id,
              ingredient_id: item.ingredient_id,
              quantity: actualQty,
            });
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
          location_id: stocktakingForm.location_id,
          ingredient_id: item.ingredient_id,
          movement_type: 'adjustment',
          quantity: difference,
          reference_id: stocktakingRecord.id,
          notes: `Инвентаризация: было ${item.system_qty.toFixed(2)}, стало ${actualQty.toFixed(2)}`,
        });
      }

      toast.success(`Инвентаризация завершена. Скорректировано ${itemsWithDifference.length} позиций`);
      setStocktakingDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при проведении инвентаризации');
    }
  };

  // View stocktaking details
  const [stocktakingDetailsOpen, setStocktakingDetailsOpen] = useState(false);
  const [selectedStocktaking, setSelectedStocktaking] = useState<StocktakingWithLocation | null>(null);
  const [stocktakingItems, setStocktakingItems] = useState<StocktakingItemWithIngredient[]>([]);

  const viewStocktakingDetails = async (stocktaking: StocktakingWithLocation) => {
    setSelectedStocktaking(stocktaking);
    setStocktakingDetailsOpen(true);

    const { data } = await supabase
      .from('stocktaking_items')
      .select('*, ingredient:ingredients(*, unit:units(*))')
      .eq('stocktaking_id', stocktaking.id)
      .order('difference', { ascending: true });

    setStocktakingItems((data as StocktakingItemWithIngredient[]) || []);
  };

  const stocktakingStats = {
    total: stocktakingForm.items.length,
    withDifference: stocktakingForm.items.filter(i => Math.abs(parseFloat(i.actual_qty) - i.system_qty) > 0.001).length,
    surplus: stocktakingForm.items.filter(i => parseFloat(i.actual_qty) - i.system_qty > 0.001).length,
    shortage: stocktakingForm.items.filter(i => i.system_qty - parseFloat(i.actual_qty) > 0.001).length,
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === 'all' || item.location_id === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [inventory, searchTerm, selectedLocation]);

  const filteredStocktakings = useMemo(() => {
    return stocktakings.filter(st => {
      const matchesLocation = stocktakingLocationFilter === 'all' || st.location_id === stocktakingLocationFilter;
      const stDate = new Date(st.created_at);
      const matchesDateFrom = !stocktakingDateFrom || stDate >= stocktakingDateFrom;
      const matchesDateTo = !stocktakingDateTo || stDate <= new Date(stocktakingDateTo.getTime() + 24 * 60 * 60 * 1000 - 1);
      return matchesLocation && matchesDateFrom && matchesDateTo;
    });
  }, [stocktakings, stocktakingLocationFilter, stocktakingDateFrom, stocktakingDateTo]);

  const filteredSupplies = useMemo(() => {
    return supplies.filter(sup => {
      const matchesLocation = suppliesLocationFilter === 'all' || sup.location_id === suppliesLocationFilter;
      const supDate = new Date(sup.created_at);
      const matchesDateFrom = !suppliesDateFrom || supDate >= suppliesDateFrom;
      const matchesDateTo = !suppliesDateTo || supDate <= new Date(suppliesDateTo.getTime() + 24 * 60 * 60 * 1000 - 1);
      return matchesLocation && matchesDateFrom && matchesDateTo;
    });
  }, [supplies, suppliesLocationFilter, suppliesDateFrom, suppliesDateTo]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(trans => {
      const matchesLocation = transfersLocationFilter === 'all' || 
        trans.from_location_id === transfersLocationFilter || 
        trans.to_location_id === transfersLocationFilter;
      const transDate = new Date(trans.created_at);
      const matchesDateFrom = !transfersDateFrom || transDate >= transfersDateFrom;
      const matchesDateTo = !transfersDateTo || transDate <= new Date(transfersDateTo.getTime() + 24 * 60 * 60 * 1000 - 1);
      return matchesLocation && matchesDateFrom && matchesDateTo;
    });
  }, [transfers, transfersLocationFilter, transfersDateFrom, transfersDateTo]);

  // Sorting
  const {
    sortedData: sortedInventory,
    sortConfig: inventorySortConfig,
    handleSort: handleInventorySort,
  } = useTableSort(filteredInventory);

  const {
    sortedData: sortedStocktakings,
    sortConfig: stocktakingsSortConfig,
    handleSort: handleStocktakingsSort,
  } = useTableSort(filteredStocktakings);

  const {
    sortedData: sortedSupplies,
    sortConfig: suppliesSortConfig,
    handleSort: handleSuppliesSort,
  } = useTableSort(filteredSupplies);

  const {
    sortedData: sortedTransfers,
    sortConfig: transfersSortConfig,
    handleSort: handleTransfersSort,
  } = useTableSort(filteredTransfers);

  // Paginated data
  const paginatedInventory = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize;
    return sortedInventory.slice(start, start + inventoryPageSize);
  }, [sortedInventory, inventoryPage, inventoryPageSize]);

  const paginatedStocktakings = useMemo(() => {
    const start = (stocktakingsPage - 1) * stocktakingsPageSize;
    return sortedStocktakings.slice(start, start + stocktakingsPageSize);
  }, [sortedStocktakings, stocktakingsPage, stocktakingsPageSize]);

  const paginatedSupplies = useMemo(() => {
    const start = (suppliesPage - 1) * suppliesPageSize;
    return sortedSupplies.slice(start, start + suppliesPageSize);
  }, [sortedSupplies, suppliesPage, suppliesPageSize]);

  const paginatedTransfers = useMemo(() => {
    const start = (transfersPage - 1) * transfersPageSize;
    return sortedTransfers.slice(start, start + transfersPageSize);
  }, [sortedTransfers, transfersPage, transfersPageSize]);

  // Reset page when filters change
  useEffect(() => { setInventoryPage(1); }, [searchTerm, selectedLocation]);
  useEffect(() => { setStocktakingsPage(1); }, [stocktakingLocationFilter, stocktakingDateFrom, stocktakingDateTo]);
  useEffect(() => { setSuppliesPage(1); }, [suppliesLocationFilter, suppliesDateFrom, suppliesDateTo]);
  useEffect(() => { setTransfersPage(1); }, [transfersLocationFilter, transfersDateFrom, transfersDateTo]);

  const lowStockItems = inventory.filter(item => 
    item.ingredient?.min_stock && Number(item.quantity) < Number(item.ingredient.min_stock)
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
          <h1 className="text-3xl font-bold">Склад</h1>
          <p className="text-muted-foreground">Остатки, поставки и перемещения</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openStocktakingDialog}>
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Инвентаризация
          </Button>
          <Button variant="outline" onClick={openBulkStockDialog}>
            <Database className="h-4 w-4 mr-2" />
            Заполнить склад
          </Button>
          <Button variant="outline" onClick={openTransferDialog}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Перемещение
          </Button>
          <Button onClick={openSupplyDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Поставка
          </Button>
        </div>
      </div>

      {/* Low stock warning */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Мало на складе ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <Badge key={item.id} variant="destructive">
                  {item.ingredient?.name}: {Number(item.quantity).toFixed(1)} {item.ingredient?.unit?.abbreviation}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Остатки</TabsTrigger>
          <TabsTrigger value="stocktakings">Инвентаризации</TabsTrigger>
          <TabsTrigger value="supplies">Поставки</TabsTrigger>
          <TabsTrigger value="transfers">Перемещения</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск ингредиента..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Точка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все точки</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inventory table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="ingredient.name"
                    currentSortKey={inventorySortConfig.key as string}
                    currentDirection={inventorySortConfig.direction}
                    onSort={handleInventorySort}
                  >
                    Ингредиент
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="location.name"
                    currentSortKey={inventorySortConfig.key as string}
                    currentDirection={inventorySortConfig.direction}
                    onSort={handleInventorySort}
                  >
                    Точка
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="quantity"
                    currentSortKey={inventorySortConfig.key as string}
                    currentDirection={inventorySortConfig.direction}
                    onSort={handleInventorySort}
                    className="text-right"
                  >
                    Остаток
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="ingredient.min_stock"
                    currentSortKey={inventorySortConfig.key as string}
                    currentDirection={inventorySortConfig.direction}
                    onSort={handleInventorySort}
                    className="text-right"
                  >
                    Мин. остаток
                  </SortableTableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Нет данных об остатках
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInventory.map(item => {
                    const isLow = item.ingredient?.min_stock && Number(item.quantity) < Number(item.ingredient.min_stock);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient?.name}</TableCell>
                        <TableCell>{item.location?.name}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.quantity).toFixed(2)} {item.ingredient?.unit?.abbreviation}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.ingredient?.min_stock || '—'}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive">Мало</Badge>
                          ) : (
                            <Badge variant="outline">В норме</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredInventory.length > 0 && (
              <TablePagination
                currentPage={inventoryPage}
                totalPages={Math.ceil(filteredInventory.length / inventoryPageSize)}
                pageSize={inventoryPageSize}
                totalItems={filteredInventory.length}
                onPageChange={setInventoryPage}
                onPageSizeChange={(size) => { setInventoryPageSize(size); setInventoryPage(1); }}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stocktakings">
          <Card className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Локация</Label>
                <Select
                  value={stocktakingLocationFilter}
                  onValueChange={setStocktakingLocationFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Все локации" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все локации</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата от</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !stocktakingDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {stocktakingDateFrom ? format(stocktakingDateFrom, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={stocktakingDateFrom}
                      onSelect={setStocktakingDateFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата до</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !stocktakingDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {stocktakingDateTo ? format(stocktakingDateTo, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={stocktakingDateTo}
                      onSelect={setStocktakingDateTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(stocktakingLocationFilter !== 'all' || stocktakingDateFrom || stocktakingDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStocktakingLocationFilter('all');
                    setStocktakingDateFrom(undefined);
                    setStocktakingDateTo(undefined);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="created_at"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                  >
                    Дата
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="location.name"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                  >
                    Локация
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="total_items"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                    className="text-right"
                  >
                    Всего позиций
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="items_with_difference"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                    className="text-right"
                  >
                    Расхождений
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="surplus_count"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                    className="text-right"
                  >
                    Излишки
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="shortage_count"
                    currentSortKey={stocktakingsSortConfig.key as string}
                    currentDirection={stocktakingsSortConfig.direction}
                    onSort={handleStocktakingsSort}
                    className="text-right"
                  >
                    Недостача
                  </SortableTableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStocktakings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {stocktakings.length === 0 ? 'Нет проведённых инвентаризаций' : 'Нет инвентаризаций по выбранным фильтрам'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStocktakings.map(st => (
                    <TableRow key={st.id}>
                      <TableCell>{new Date(st.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{st.location?.name}</TableCell>
                      <TableCell className="text-right">{st.total_items}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={st.items_with_difference > 0 ? 'secondary' : 'outline'}>
                          {st.items_with_difference}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">+{st.surplus_count}</TableCell>
                      <TableCell className="text-right text-destructive">-{st.shortage_count}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewStocktakingDetails(st)}
                        >
                          Детали
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredStocktakings.length > 0 && (
              <TablePagination
                currentPage={stocktakingsPage}
                totalPages={Math.ceil(filteredStocktakings.length / stocktakingsPageSize)}
                pageSize={stocktakingsPageSize}
                totalItems={filteredStocktakings.length}
                onPageChange={setStocktakingsPage}
                onPageSizeChange={(size) => { setStocktakingsPageSize(size); setStocktakingsPage(1); }}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="supplies">
          <Card className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Локация</Label>
                <Select
                  value={suppliesLocationFilter}
                  onValueChange={setSuppliesLocationFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Все локации" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все локации</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата от</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !suppliesDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {suppliesDateFrom ? format(suppliesDateFrom, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={suppliesDateFrom}
                      onSelect={setSuppliesDateFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата до</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !suppliesDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {suppliesDateTo ? format(suppliesDateTo, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={suppliesDateTo}
                      onSelect={setSuppliesDateTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(suppliesLocationFilter !== 'all' || suppliesDateFrom || suppliesDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSuppliesLocationFilter('all');
                    setSuppliesDateFrom(undefined);
                    setSuppliesDateTo(undefined);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="created_at"
                    currentSortKey={suppliesSortConfig.key as string}
                    currentDirection={suppliesSortConfig.direction}
                    onSort={handleSuppliesSort}
                  >
                    Дата
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="location.name"
                    currentSortKey={suppliesSortConfig.key as string}
                    currentDirection={suppliesSortConfig.direction}
                    onSort={handleSuppliesSort}
                  >
                    Точка
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="supplier_name"
                    currentSortKey={suppliesSortConfig.key as string}
                    currentDirection={suppliesSortConfig.direction}
                    onSort={handleSuppliesSort}
                  >
                    Поставщик
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="invoice_number"
                    currentSortKey={suppliesSortConfig.key as string}
                    currentDirection={suppliesSortConfig.direction}
                    onSort={handleSuppliesSort}
                  >
                    Накладная
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="total_amount"
                    currentSortKey={suppliesSortConfig.key as string}
                    currentDirection={suppliesSortConfig.direction}
                    onSort={handleSuppliesSort}
                    className="text-right"
                  >
                    Сумма
                  </SortableTableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSupplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {supplies.length === 0 ? 'Нет поставок' : 'Нет поставок по выбранным фильтрам'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSupplies.map(sup => (
                    <TableRow key={sup.id}>
                      <TableCell>{new Date(sup.created_at).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>{sup.location?.name}</TableCell>
                      <TableCell>{sup.supplier_name || '—'}</TableCell>
                      <TableCell>{sup.invoice_number || '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₽{Number(sup.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sup.status === 'received' ? 'default' : 'secondary'}>
                          {sup.status === 'received' ? 'Получено' : sup.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredSupplies.length > 0 && (
              <TablePagination
                currentPage={suppliesPage}
                totalPages={Math.ceil(filteredSupplies.length / suppliesPageSize)}
                pageSize={suppliesPageSize}
                totalItems={filteredSupplies.length}
                onPageChange={setSuppliesPage}
                onPageSizeChange={(size) => { setSuppliesPageSize(size); setSuppliesPage(1); }}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Локация</Label>
                <Select
                  value={transfersLocationFilter}
                  onValueChange={setTransfersLocationFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Все локации" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все локации</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата от</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !transfersDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transfersDateFrom ? format(transfersDateFrom, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transfersDateFrom}
                      onSelect={setTransfersDateFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Дата до</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-40 justify-start text-left font-normal",
                        !transfersDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transfersDateTo ? format(transfersDateTo, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transfersDateTo}
                      onSelect={setTransfersDateTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(transfersLocationFilter !== 'all' || transfersDateFrom || transfersDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTransfersLocationFilter('all');
                    setTransfersDateFrom(undefined);
                    setTransfersDateTo(undefined);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="created_at"
                    currentSortKey={transfersSortConfig.key as string}
                    currentDirection={transfersSortConfig.direction}
                    onSort={handleTransfersSort}
                  >
                    Дата
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="from_location.name"
                    currentSortKey={transfersSortConfig.key as string}
                    currentDirection={transfersSortConfig.direction}
                    onSort={handleTransfersSort}
                  >
                    Откуда
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="to_location.name"
                    currentSortKey={transfersSortConfig.key as string}
                    currentDirection={transfersSortConfig.direction}
                    onSort={handleTransfersSort}
                  >
                    Куда
                  </SortableTableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {transfers.length === 0 ? 'Нет перемещений' : 'Нет перемещений по выбранным фильтрам'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransfers.map(trans => (
                    <TableRow key={trans.id}>
                      <TableCell>{new Date(trans.created_at).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>{trans.from_location?.name}</TableCell>
                      <TableCell>{trans.to_location?.name}</TableCell>
                      <TableCell>
                        <Badge variant={trans.status === 'completed' ? 'default' : 'secondary'}>
                          {trans.status === 'completed' ? 'Завершено' : trans.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredTransfers.length > 0 && (
              <TablePagination
                currentPage={transfersPage}
                totalPages={Math.ceil(filteredTransfers.length / transfersPageSize)}
                pageSize={transfersPageSize}
                totalItems={filteredTransfers.length}
                onPageChange={setTransfersPage}
                onPageSizeChange={(size) => { setTransfersPageSize(size); setTransfersPage(1); }}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supply Dialog */}
      <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая поставка</DialogTitle>
            <DialogDescription>Оформите приход товаров на склад</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Точка *</Label>
                <Select
                  value={supplyForm.location_id}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Поставщик</Label>
                <Input
                  value={supplyForm.supplier_name}
                  onChange={(e) => setSupplyForm({ ...supplyForm, supplier_name: e.target.value })}
                  placeholder="ООО Продукты"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Номер накладной</Label>
              <Input
                value={supplyForm.invoice_number}
                onChange={(e) => setSupplyForm({ ...supplyForm, invoice_number: e.target.value })}
                placeholder="ТН-12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Товары</Label>
              {supplyForm.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={item.ingredient_id}
                    onValueChange={(v) => updateSupplyItem(index, 'ingredient_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit?.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={item.quantity}
                    onChange={(e) => updateSupplyItem(index, 'quantity', e.target.value)}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="Цена"
                    value={item.cost_per_unit}
                    onChange={(e) => updateSupplyItem(index, 'cost_per_unit', e.target.value)}
                    className="w-24"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSupplyItem}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplyDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateSupply}>Оформить поставку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Перемещение между точками</DialogTitle>
            <DialogDescription>Переместите товары с одного склада на другой</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Откуда *</Label>
                <Select
                  value={transferForm.from_location_id}
                  onValueChange={(v) => setTransferForm({ ...transferForm, from_location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Куда *</Label>
                <Select
                  value={transferForm.to_location_id}
                  onValueChange={(v) => setTransferForm({ ...transferForm, to_location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== transferForm.from_location_id).map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Товары</Label>
              {transferForm.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={item.ingredient_id}
                    onValueChange={(v) => updateTransferItem(index, 'ingredient_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ингредиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit?.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Кол-во"
                    value={item.quantity}
                    onChange={(e) => updateTransferItem(index, 'quantity', e.target.value)}
                    className="w-24"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTransferItem}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTransfer}>Оформить перемещение</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Stock Dialog */}
      <Dialog open={bulkStockDialogOpen} onOpenChange={setBulkStockDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Быстрое заполнение склада</DialogTitle>
            <DialogDescription>Добавьте начальные остатки для всех ингредиентов сразу</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Локация *</Label>
                <Select
                  value={bulkStockForm.location_id}
                  onValueChange={(v) => setBulkStockForm({ ...bulkStockForm, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Количество для всех</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bulkStockForm.default_quantity}
                    onChange={(e) => setAllBulkQuantity(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAllBulkItems(true)}
                  >
                    Все
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAllBulkItems(false)}
                  >
                    Ничего
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="w-32">Количество</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkStockForm.items.map(item => {
                    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
                    return (
                      <TableRow key={item.ingredient_id}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleBulkItem(item.ingredient_id)}
                          />
                        </TableCell>
                        <TableCell>
                          {item.name}
                          <span className="text-muted-foreground ml-1">
                            ({ingredient?.unit?.abbreviation || ''})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateBulkItemQuantity(item.ingredient_id, e.target.value)}
                            className="w-24"
                            disabled={!item.selected}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Выбрано: {bulkStockForm.items.filter(i => i.selected).length} из {bulkStockForm.items.length} ингредиентов
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStockDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleBulkStock}>Добавить на склад</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stocktaking Dialog */}
      <Dialog open={stocktakingDialogOpen} onOpenChange={setStocktakingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Инвентаризация
            </DialogTitle>
            <DialogDescription>
              Введите фактические остатки. Расхождения будут скорректированы автоматически.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Локация *</Label>
              <Select
                value={stocktakingForm.location_id}
                onValueChange={(v) => loadStocktakingItems(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Выберите локацию" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Всего позиций</CardDescription>
                  <CardTitle className="text-xl">{stocktakingStats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>С расхождением</CardDescription>
                  <CardTitle className="text-xl text-amber-600">{stocktakingStats.withDifference}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Излишки</CardDescription>
                  <CardTitle className="text-xl text-green-600">{stocktakingStats.surplus}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Недостача</CardDescription>
                  <CardTitle className="text-xl text-destructive">{stocktakingStats.shortage}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Items table */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ингредиент</TableHead>
                    <TableHead className="text-right">По системе</TableHead>
                    <TableHead className="text-right w-32">Факт</TableHead>
                    <TableHead className="text-right">Разница</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocktakingForm.items.map(item => {
                    const diff = parseFloat(item.actual_qty) - item.system_qty;
                    const hasDiff = Math.abs(diff) > 0.001;
                    return (
                      <TableRow 
                        key={item.ingredient_id}
                        className={hasDiff ? (diff > 0 ? 'bg-green-500/5' : 'bg-destructive/5') : ''}
                      >
                        <TableCell className="font-medium">
                          {item.name}
                          <span className="text-muted-foreground ml-1">({item.unit_abbr})</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.system_qty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.actual_qty}
                            onChange={(e) => updateStocktakingItem(item.ingredient_id, e.target.value)}
                            className="w-24 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          hasDiff ? (diff > 0 ? 'text-green-600' : 'text-destructive') : ''
                        }`}>
                          {hasDiff ? (diff > 0 ? '+' : '') + diff.toFixed(2) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStocktakingDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleStocktaking} disabled={stocktakingStats.withDifference === 0}>
              Провести инвентаризацию ({stocktakingStats.withDifference} поз.)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stocktaking Details Dialog */}
      <Dialog open={stocktakingDetailsOpen} onOpenChange={setStocktakingDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Инвентаризация от {selectedStocktaking && new Date(selectedStocktaking.created_at).toLocaleDateString('ru-RU')}
            </DialogTitle>
            <DialogDescription>
              {selectedStocktaking?.location?.name} — {selectedStocktaking?.items_with_difference} расхождений
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Всего</CardDescription>
                  <CardTitle className="text-xl">{selectedStocktaking?.total_items}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Расхождений</CardDescription>
                  <CardTitle className="text-xl text-amber-600">{selectedStocktaking?.items_with_difference}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Излишки</CardDescription>
                  <CardTitle className="text-xl text-green-600">{selectedStocktaking?.surplus_count}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Недостача</CardDescription>
                  <CardTitle className="text-xl text-destructive">{selectedStocktaking?.shortage_count}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Items table */}
            {stocktakingItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет расхождений</p>
            ) : (
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ингредиент</TableHead>
                      <TableHead className="text-right">По системе</TableHead>
                      <TableHead className="text-right">Факт</TableHead>
                      <TableHead className="text-right">Разница</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocktakingItems.map(item => {
                      const diff = Number(item.difference);
                      return (
                        <TableRow 
                          key={item.id}
                          className={diff > 0 ? 'bg-green-500/5' : 'bg-destructive/5'}
                        >
                          <TableCell className="font-medium">
                            {item.ingredient?.name}
                            <span className="text-muted-foreground ml-1">
                              ({item.ingredient?.unit?.abbreviation})
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {Number(item.system_quantity).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(item.actual_quantity).toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${diff > 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStocktakingDetailsOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
