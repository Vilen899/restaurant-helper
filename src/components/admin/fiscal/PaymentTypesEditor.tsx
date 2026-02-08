import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PaymentType {
  Id: string;
  Name: string;
  UseExtPos: boolean;
  PaymentType: "paidAmount" | "paidAmountCard";
}

interface PaymentTypesEditorProps {
  paymentTypes: PaymentType[];
  onChange: (paymentTypes: PaymentType[]) => void;
}

export function PaymentTypesEditor({ paymentTypes, onChange }: PaymentTypesEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PaymentType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PaymentType, "Id">>({
    Name: "",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
  });

  const handleEdit = (item: PaymentType) => {
    setEditingId(item.Id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onChange(paymentTypes.map((p) => (p.Id === editForm.Id ? editForm : p)));
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleDelete = (id: string) => {
    onChange(paymentTypes.filter((p) => p.Id !== id));
  };

  const handleAdd = () => {
    if (!newItem.Name.trim()) return;
    const newPaymentType: PaymentType = {
      Id: crypto.randomUUID(),
      ...newItem,
    };
    onChange([...paymentTypes, newPaymentType]);
    setNewItem({ Name: "", UseExtPos: true, PaymentType: "paidAmountCard" });
    setIsAdding(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div>
          <h2 className="text-xl font-semibold">Способы оплаты (PaymentTypes)</h2>
          <p className="text-sm text-muted-foreground">Настройка маппинга способов оплаты для ККМ</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
          <div className="col-span-4">Название</div>
          <div className="col-span-3">Тип платежа</div>
          <div className="col-span-2">ExtPOS</div>
          <div className="col-span-3 text-right">Действия</div>
        </div>

        {/* Items */}
        {paymentTypes.map((item) => (
          <div
            key={item.Id}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            {editingId === item.Id && editForm ? (
              <>
                <div className="col-span-4">
                  <Input
                    value={editForm.Name}
                    onChange={(e) => setEditForm({ ...editForm, Name: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    value={editForm.PaymentType}
                    onValueChange={(v) => setEditForm({ ...editForm, PaymentType: v as "paidAmount" | "paidAmountCard" })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paidAmount">Наличные</SelectItem>
                      <SelectItem value="paidAmountCard">Безналичные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Switch
                    checked={editForm.UseExtPos}
                    onCheckedChange={(v) => setEditForm({ ...editForm, UseExtPos: v })}
                  />
                </div>
                <div className="col-span-3 flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-4 font-medium truncate">{item.Name}</div>
                <div className="col-span-3">
                  <Badge variant={item.PaymentType === "paidAmount" ? "default" : "secondary"}>
                    {item.PaymentType === "paidAmount" ? "Наличные" : "Безналичные"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Badge variant={item.UseExtPos ? "outline" : "secondary"}>
                    {item.UseExtPos ? "Да" : "Нет"}
                  </Badge>
                </div>
                <div className="col-span-3 flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.Id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new item */}
        {isAdding && (
          <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-dashed border-primary/50 bg-primary/5">
            <div className="col-span-4">
              <Input
                value={newItem.Name}
                onChange={(e) => setNewItem({ ...newItem, Name: e.target.value })}
                placeholder="Название способа оплаты"
                className="h-8"
              />
            </div>
            <div className="col-span-3">
              <Select
                value={newItem.PaymentType}
                onValueChange={(v) => setNewItem({ ...newItem, PaymentType: v as "paidAmount" | "paidAmountCard" })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paidAmount">Наличные</SelectItem>
                  <SelectItem value="paidAmountCard">Безналичные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Switch
                checked={newItem.UseExtPos}
                onCheckedChange={(v) => setNewItem({ ...newItem, UseExtPos: v })}
              />
            </div>
            <div className="col-span-3 flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={handleAdd}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        )}

        {paymentTypes.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            Нет настроенных способов оплаты. Нажмите "Добавить" для создания.
          </div>
        )}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p><strong>paidAmount</strong> — для наличных расчётов</p>
        <p><strong>paidAmountCard</strong> — для безналичных (карты, Glovo, Idram и т.д.)</p>
        <p><strong>UseExtPos</strong> — использовать внешний POS-терминал</p>
      </div>
    </Card>
  );
}
