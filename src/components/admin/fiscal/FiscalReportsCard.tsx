import { useState } from "react";
import { FileText, Printer, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FiscalReportsCardProps {
  config: {
    Host: string;
    Port: string;
    LocalProxyUrl: string;
    CashierId: string;
    CashierPin: string;
    KkmPassword: string;
  };
}

export function FiscalReportsCard({ config }: FiscalReportsCardProps) {
  const [isXReportLoading, setIsXReportLoading] = useState(false);
  const [isZReportLoading, setIsZReportLoading] = useState(false);
  const [confirmZReport, setConfirmZReport] = useState(false);

  const getKkmUrl = () => {
    if (config.LocalProxyUrl) {
      return config.LocalProxyUrl;
    }
    return `http://${config.Host}:${config.Port}`;
  };

  const handleXReport = async () => {
    setIsXReportLoading(true);
    try {
      const baseUrl = getKkmUrl();
      const response = await fetch(`${baseUrl}/api/v1/x-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierId: config.CashierId,
          cashierPin: config.CashierPin,
          password: config.KkmPassword,
        }),
      });

      if (response.ok) {
        toast.success("✅ X-отчёт успешно напечатан");
      } else {
        const error = await response.text();
        toast.error(`❌ Ошибка X-отчёта: ${error}`);
      }
    } catch (err: any) {
      toast.error(`❌ Ошибка связи с ККМ: ${err.message}`);
    } finally {
      setIsXReportLoading(false);
    }
  };

  const handleZReport = async () => {
    setIsZReportLoading(true);
    try {
      const baseUrl = getKkmUrl();
      const response = await fetch(`${baseUrl}/api/v1/z-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierId: config.CashierId,
          cashierPin: config.CashierPin,
          password: config.KkmPassword,
        }),
      });

      if (response.ok) {
        toast.success("✅ Z-отчёт успешно напечатан. Смена закрыта.");
      } else {
        const error = await response.text();
        toast.error(`❌ Ошибка Z-отчёта: ${error}`);
      }
    } catch (err: any) {
      toast.error(`❌ Ошибка связи с ККМ: ${err.message}`);
    } finally {
      setIsZReportLoading(false);
      setConfirmZReport(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Printer className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Фискальные отчёты</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* X-Report */}
          <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">X-отчёт</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Промежуточный отчёт без закрытия смены. Показывает текущие итоги.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleXReport}
                  disabled={isXReportLoading}
                  className="w-full"
                >
                  {isXReportLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  Печать X-отчёта
                </Button>
              </div>
            </div>
          </div>

          {/* Z-Report */}
          <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Z-отчёт</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Закрытие смены. Обнуляет счётчики и фиксирует выручку в фискальной памяти.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmZReport(true)}
                  disabled={isZReportLoading}
                  className="w-full"
                >
                  {isZReportLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  Печать Z-отчёта
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2">
          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p><strong>X-отчёт</strong> — можно печатать сколько угодно раз, не влияет на смену</p>
            <p><strong>Z-отчёт</strong> — закрывает фискальную смену, печатать 1 раз в конце дня</p>
          </div>
        </div>
      </Card>

      {/* Z-Report Confirmation Dialog */}
      <AlertDialog open={confirmZReport} onOpenChange={setConfirmZReport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Подтверждение Z-отчёта
            </AlertDialogTitle>
            <AlertDialogDescription>
              Z-отчёт закроет текущую фискальную смену и обнулит счётчики. Это действие нельзя отменить.
              <br /><br />
              Вы уверены, что хотите напечатать Z-отчёт?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleZReport} className="bg-destructive text-destructive-foreground">
              Да, напечатать Z-отчёт
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
