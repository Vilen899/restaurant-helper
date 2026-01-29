import { useState } from "react";
import { Box, ArrowDownToLine, ArrowRightLeft, Calculator, History } from "lucide-react";

// ИМПОРТИРУЕМ ТВОИ ФАЙЛЫ (убедись, что названия файлов совпадают)
import StockOverview from "./StockOverview";
import GoodsReceipt from "./GoodsReceipt";
import StockTransfer from "./StockTransfer";
import PhysicalInventory from "./PhysicalInventory";
import MovementJournal from "./MovementJournal";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("mmbe");

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* ЛЕВОЕ МЕНЮ (SIDEBAR) */}
      <div className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col p-2 gap-1">
        <div className="p-6 mb-4 border-b border-white/5">
          <h1 className="text-xl font-black text-indigo-500 italic">SAP SYSTEM</h1>
        </div>

        <NavBtn
          act={activeTab === "mmbe"}
          icon={<Box size={18} />}
          label="MMBE: Остатки"
          onClick={() => setActiveTab("mmbe")}
        />
        <NavBtn
          act={activeTab === "migo"}
          icon={<ArrowDownToLine size={18} />}
          label="MIGO: Приход"
          onClick={() => setActiveTab("migo")}
        />
        <NavBtn
          act={activeTab === "mb1b"}
          icon={<ArrowRightLeft size={18} />}
          label="MB1B: Перенос"
          onClick={() => setActiveTab("mb1b")}
        />
        <NavBtn
          act={activeTab === "mi01"}
          icon={<Calculator size={18} />}
          label="MI01: Подсчет"
          onClick={() => setActiveTab("mi01")}
        />
        <NavBtn
          act={activeTab === "mb51"}
          icon={<History size={18} />}
          label="MB51: Журнал"
          onClick={() => setActiveTab("mb51")}
        />
      </div>

      {/* ОБЛАСТЬ КОНТЕНТА - ЗДЕСЬ ПОЯВЛЯЮТСЯ ТВОИ СТРАНИЦЫ */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "mmbe" && <StockOverview />}
        {activeTab === "migo" && <GoodsReceipt />}
        {activeTab === "mb1b" && <StockTransfer />}
        {activeTab === "mi01" && <PhysicalInventory />}
        {activeTab === "mb51" && <MovementJournal />}
      </div>
    </div>
  );
}

// Компонент кнопки
function NavBtn({ act, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 h-12 text-[11px] font-bold uppercase transition-all ${
        act ? "bg-indigo-600 text-white rounded-md" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {icon} {label}
    </button>
  );
}
