import React, { useState } from "react";

// --------------------
// ВСТРОЕННЫЙ DIALOG
// --------------------
type CloseShiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  userId: string;
  userName: string;
  onConfirm: () => void;
};

const CloseShiftDialog: React.FC<CloseShiftDialogProps> = ({ open, onOpenChange, userName, onConfirm }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          minWidth: 300,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Закрыть смену</h2>

        <p style={{ marginTop: 12 }}>
          Кассир: <b>{userName}</b>
        </p>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          >
            Отмена
          </button>

          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#e11d48",
              color: "#fff",
              border: "none",
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// --------------------
// CASHIER PAGE
// --------------------
const CashierPage: React.FC = () => {
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);

  const session = {
    id: "1",
    full_name: "Cashier User",
    location_id: "LOC-001",
  };

  const handleLogout = () => {
    console.log("Смена закрыта");
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Касса</h1>

      <button
        onClick={() => setCloseShiftDialogOpen(true)}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 10,
          background: "#e11d48",
          color: "#fff",
          border: "none",
        }}
      >
        Закрыть смену
      </button>

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
