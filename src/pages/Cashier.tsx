import React, { useState } from "react";

// UI
import { Button } from "@/components/ui/button";

// Диалоги кассира
import { CloseShiftDialog } from "@/components/cashier/CloseShiftDialog";

// ----------------------------
// Типы (пример)
// ----------------------------
interface Session {
  id: string;
  full_name: string;
  location_id: string;
}

// ----------------------------
// Страница кассира
// ----------------------------
const CashierPage: React.FC = () => {
  // состояние сессии (пример)
  const [session] = useState<Session>({
    id: "1",
    full_name: "Cashier User",
    location_id: "LOC-001",
  });

  // состояние диалога закрытия смены
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);

  // обработчик выхода / закрытия смены
  const handleLogout = async () => {
    console.log("Смена закрыта");
    // тут твоя логика:
    // - API закрытия смены
    // - очистка стора
    // - редирект
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Касса — {session.full_name}</h1>

      <Button variant="destructive" onClick={() => setCloseShiftDialogOpen(true)}>
        Закрыть смену
      </Button>

      {/* Диалог закрытия смены */}
      <CloseShiftDialog
        open={closeShiftDialogOpen}
        onOpenChange={setCloseShiftDialogOpen}
        locationId={session.location_id}
        userId={session.id}
        userName={session.full_name}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default CashierPage;
