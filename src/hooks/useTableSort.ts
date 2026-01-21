import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useTableSort<T>(data: T[], initialSortKey?: keyof T | string) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialSortKey || '',
    direction: null,
  });

  const handleSort = useCallback((key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
      };

      const aValue = getNestedValue(a, sortConfig.key as string);
      const bValue = getNestedValue(b, sortConfig.key as string);

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle date strings
      const aDate = Date.parse(aValue);
      const bDate = Date.parse(bValue);
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr, 'ru');
      }
      return bStr.localeCompare(aStr, 'ru');
    });
  }, [data, sortConfig]);

  return {
    sortedData,
    sortConfig,
    handleSort,
    resetSort: () => setSortConfig({ key: '', direction: null }),
  };
}
