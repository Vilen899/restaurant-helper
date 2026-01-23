import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type MenuItem = Tables<"menu_items">;
type MenuCategory = Tables<"menu_categories">;

interface MenuSearchProps {
  menuItems: MenuItem[];
  categories: MenuCategory[];
  onItemSelect: (item: MenuItem) => void;
}

export function MenuSearch({ menuItems, categories, onItemSelect }: MenuSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '';
  };

  const filteredItems = query.length >= 1
    ? menuItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        getCategoryName(item.category_id).toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (item: MenuItem) => {
    onItemSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Поиск по меню... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && filteredItems.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
          <ScrollArea className="max-h-80">
            <CardContent className="p-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                  )}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      —
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getCategoryName(item.category_id)}
                    </p>
                  </div>
                  <span className="font-semibold text-primary whitespace-nowrap">
                    {Number(item.price).toLocaleString()} ֏
                  </span>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {/* No results */}
      {isOpen && query.length >= 1 && filteredItems.length === 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
          <CardContent className="p-4 text-center text-muted-foreground">
            Ничего не найдено
          </CardContent>
        </Card>
      )}
    </div>
  );
}
