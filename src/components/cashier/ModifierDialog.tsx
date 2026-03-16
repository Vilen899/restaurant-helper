import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<'menu_items'>;

interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
}

interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  ingredient_id: string | null;
  ingredient_quantity: number;
}

export interface SelectedModifier {
  id: string;
  name: string;
  price_adjustment: number;
  ingredient_id: string | null;
  ingredient_quantity: number;
}

interface ModifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  onConfirm: (item: MenuItem, modifiers: SelectedModifier[]) => void;
}

export function ModifierDialog({ open, onOpenChange, menuItem, onConfirm }: ModifierDialogProps) {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [options, setOptions] = useState<ModifierOption[]>([]);
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && menuItem) {
      loadModifiers(menuItem.id);
    }
  }, [open, menuItem]);

  const loadModifiers = async (menuItemId: string) => {
    setLoading(true);
    setSelected(new Map());

    // Get modifier groups assigned to this menu item
    const { data: assignments } = await supabase
      .from('menu_item_modifier_groups')
      .select('modifier_group_id, is_required, sort_order')
      .eq('menu_item_id', menuItemId)
      .order('sort_order');

    if (!assignments || assignments.length === 0) {
      setGroups([]);
      setOptions([]);
      setLoading(false);
      return;
    }

    const groupIds = assignments.map(a => a.modifier_group_id);

    // Load groups and modifiers in parallel
    const [{ data: groupsData }, { data: modsData }] = await Promise.all([
      supabase.from('modifier_groups').select('*').in('id', groupIds).eq('is_active', true),
      supabase.from('modifiers').select('*').in('group_id', groupIds).eq('is_active', true).order('sort_order'),
    ]);

    const enrichedGroups: ModifierGroup[] = (groupsData || []).map(g => {
      const assignment = assignments.find(a => a.modifier_group_id === g.id);
      return {
        id: g.id,
        name: g.name,
        min_select: g.min_select,
        max_select: g.max_select,
        is_required: assignment?.is_required ?? false,
      };
    }).sort((a, b) => {
      const aIdx = assignments.findIndex(x => x.modifier_group_id === a.id);
      const bIdx = assignments.findIndex(x => x.modifier_group_id === b.id);
      return aIdx - bIdx;
    });

    setGroups(enrichedGroups);
    setOptions((modsData || []).map(m => ({
      id: m.id,
      group_id: m.group_id,
      name: m.name,
      price_adjustment: Number(m.price_adjustment),
      ingredient_id: m.ingredient_id,
      ingredient_quantity: Number(m.ingredient_quantity),
    })));
    setLoading(false);
  };

  const toggleOption = (groupId: string, modId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setSelected(prev => {
      const next = new Map(prev);
      const groupSet = new Set(next.get(groupId) || []);

      if (groupSet.has(modId)) {
        groupSet.delete(modId);
      } else {
        // Single select: clear others first
        if (group.max_select === 1) {
          groupSet.clear();
        } else if (groupSet.size >= group.max_select) {
          return prev; // at max
        }
        groupSet.add(modId);
      }

      next.set(groupId, groupSet);
      return next;
    });
  };

  const isValid = () => {
    for (const group of groups) {
      if (group.is_required || group.min_select > 0) {
        const count = selected.get(group.id)?.size || 0;
        if (count < Math.max(group.min_select, 1)) return false;
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!menuItem) return;

    const selectedModifiers: SelectedModifier[] = [];
    selected.forEach((modIds) => {
      modIds.forEach(modId => {
        const opt = options.find(o => o.id === modId);
        if (opt) {
          selectedModifiers.push({
            id: opt.id,
            name: opt.name,
            price_adjustment: opt.price_adjustment,
            ingredient_id: opt.ingredient_id,
            ingredient_quantity: opt.ingredient_quantity,
          });
        }
      });
    });

    onConfirm(menuItem, selectedModifiers);
    onOpenChange(false);
  };

  const totalAdjustment = Array.from(selected.values()).reduce((sum, modIds) => {
    modIds.forEach(modId => {
      const opt = options.find(o => o.id === modId);
      if (opt) sum += opt.price_adjustment;
    });
    return sum;
  }, 0);

  if (!menuItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{menuItem.name}</DialogTitle>
          <p className="text-gray-400 text-sm">
            {Number(menuItem.price).toLocaleString()} ֏
            {totalAdjustment > 0 && (
              <span className="text-green-400 ml-2">+{totalAdjustment.toLocaleString()} ֏</span>
            )}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {groups.map(group => {
              const groupOptions = options.filter(o => o.group_id === group.id);
              const selectedSet = selected.get(group.id) || new Set();

              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white">{group.name}</span>
                    {(group.is_required || group.min_select > 0) && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        обязательно
                      </Badge>
                    )}
                    {group.max_select > 1 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-600 text-gray-400">
                        до {group.max_select}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    {groupOptions.map(opt => {
                      const isSelected = selectedSet.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          className={cn(
                            'flex items-center justify-between p-2.5 rounded-lg border transition-all text-left',
                            isSelected
                              ? 'border-primary bg-primary/20 text-white'
                              : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                          )}
                          onClick={() => toggleOption(group.id, opt.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center',
                              group.max_select === 1 ? 'rounded-full' : 'rounded',
                              isSelected ? 'bg-primary border-primary' : 'border-gray-600'
                            )}>
                              {isSelected && (
                                <div className={cn('bg-white', group.max_select === 1 ? 'w-2 h-2 rounded-full' : 'w-2.5 h-2.5 rounded-sm')} />
                              )}
                            </div>
                            <span className="text-sm font-medium">{opt.name}</span>
                          </div>
                          {opt.price_adjustment > 0 && (
                            <span className="text-green-400 text-sm font-medium">
                              +{opt.price_adjustment.toLocaleString()} ֏
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid()} className="bg-primary">
            Добавить • {(Number(menuItem.price) + totalAdjustment).toLocaleString()} ֏
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
