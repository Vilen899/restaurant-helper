import { useState, useEffect } from "react";
import {
  Save,
  Wifi,
  Zap,
  CreditCard,
  MapPin,
  Terminal,
  Lock,
  Database,
  ShieldCheck,
  Clock,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const XML_PAYMENT_METHODS = [
  { Id: "09322f46-578a-d210-add7-eec222a08871", Name: "Կանխիկ", UseExtPos: true, PaymentType: "paidAmount" },
  { Id: "768a07d5-f689-4850-bc93-5fdb9d3a9241", Name: "Bank Cards", UseExtPos: false, PaymentType: "paidAmountCard" },
  { Id: "6dcb7577-458d-4215-b29f-08ee5dc3dbce", Name: "Glovo", UseExtPos: true, PaymentType: "paidAmountCard" },
  { Id: "c58e022d-96f2-4f50-b94f-3831f3c90265", Name: "Yandex", UseExtPos: true, PaymentType: "paidAmountCard" },
  { Id: "7a0ae73c-b12b-4025-9783-85a77156cbcb", Name: "Buy.Am", UseExtPos: true, PaymentType: "paidAmountCard" },
  { Id: "78c242fc-6fad-4ee6-9a44-7fbdfd54f7e5", Name: "Tel Cell", UseExtPos: true, PaymentType: "paidAmountCard" },
  { Id: "3859f307-61e4-4bcd-9314-757f831d8c23", Name: "Idram", UseExtPos: true, PaymentType: "paidAmountCard" },
  {
    Id: "9c4eebef-dd32-4883-ab1a-1d0854e75dcf",
    Name: "Հյուրասիրություն",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
  },
  {
    Id: "27144aaf-e4ac-438e-9155-68280819edad",
    Name: "Առաքում POS ով",
    UseExtPos: true,
    PaymentType: "paidAmountCard",
  },
];

const XML_DEFAULTS = {
  Host: "192.168.9.19",
  Port: "8080",
  CashierId: "3",
  CashierPin: "4321",
  KkmPassword: "Aa1111Bb",
  VatRate: 16.67,
  UseDiscountInKkm: true,
  UseSubchargeAsDish: true,
  UseKitchenName: true,
  DefaultAdg: "56.10",
  UseDefaultAdg: true,
  UseDepartmentFromKitchenName: false,
  BonusPaymentName: "",
  C16CardIdTransfer: false,
  SubchargeAsDishCode: "999999",
  SubchargeAsDishName: "Հանрային սննդի կազմակերպում",
  SubchargeAsDishAdgCode: "56.10",
  SubchargeAsDishUnit: "հատ․",
  DefaultOperationTimeout: 30000,
  KkmPaymentTimeout: 120000,
  AdgCodeFromProductCodeLength: 1,
  AdgCodeFromProductFastCodeLength: 1,
  BackupDaysLimit: 14,
  VersionMajor: 0,
  VersionMinor: 7,
  AggregateSales: false,
  AggregateSaleName: "",
  AggregateSaleAdg: "",
  AggregateSaleCode: "",
  AggregateSaleUnit: "",
  DisableCashInOut: true,
  DoXReport: false,
  DoZReport: false,
  CounterToRelogin: 50,
  DebugMode: 1,
  Mode: "Manual",
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState({ ...XML_DEFAULTS, location_id: "", PaymentTypes: XML_PAYMENT_METHODS });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- НОВЫЕ ПОЛЯ ДЛЯ ПРОВЕРКИ ---
  const [testing, setTesting] = useState(false);
  const [connStatus, setConnStatus] = useState<"offline" | "online" | "unknown">("unknown");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (data?.length) {
        setLocations(data);
        await loadSettings(data[0].id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadSettings(locId) {
    setLoading(true);
    setConnStatus("unknown"); // Сбрасываем статус при смене локации
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
    if (data) {
      setConfig({
        ...XML_DEFAULTS,
        ...data,
        location_id: locId,
        PaymentTypes: data.PaymentTypes || XML_PAYMENT_METHODS,
      });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId, PaymentTypes: XML_PAYMENT_METHODS });
    }
    setLoading(false);
  }

  // --- ФУНКЦИЯ ПРОВЕРКИ КАССЫ ---
  const checkKkmStatus = async () => {
    setTesting(true);
    try {
      // Пытаемся постучаться по указанному адресу
      // ВАЖНО: Это сработает, только если браузер находится в той же сети, что и касса!
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000); // Таймаут 5 сек

      const res = await fetch(`http://${config.Host}:${config.Port}/api/v1/status`, {
        signal: controller.signal,
        mode: "no-cors", // Кассы часто не поддерживают CORS
      });

      setConnStatus("online");
      toast.success("KKM ОТВЕЧАЕТ (Network OK)");
    } catch (err) {
      setConnStatus("offline");
      toast.error("НЕТ СВЯЗИ: Касса не найдена по адресу " + config.Host);
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    const { error } = await supabase
      .from("fiscal_settings")
      .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: "location_id" });
    if (!error) toast.success("Данные сохранены");
    else toast.error(error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-emerald-500 italic uppercase tracking-widest">
        Loading_Core_Manifest...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-xl">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">HDM Driver Config</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <MapPin className="h-3 w-3" />
                <select
                  className="bg-transparent border-none outline-none text-emerald-500"
                  value={config.location_id}
                  onChange={(e) => loadSettings(e.target.value)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-slate-900">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <Button
            onClick={save}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 h-12 rounded-xl text-[11px] tracking-widest shadow-xl transition-all"
          >
            <Save className="mr-2 h-4 w-4" /> SAVE TO DATABASE
          </Button>
        </div>

        {/* CONNECTION CARD С КНОПКОЙ ПРОВЕРКИ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-blue-500 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-blue-500">
                <Wifi className="h-4 w-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Network</h3>
              </div>

              {/* ИНДИКАТОР СТАТУСА */}
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[8px] font-black ${
                  connStatus === "online"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : connStatus === "offline"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${connStatus === "online" ? "bg-emerald-500 animate-pulse" : "bg-current"}`}
                />
                {connStatus.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Host IP</Label>
                  <Input
                    value={config.Host}
                    onChange={(e) => setConfig({ ...config, Host: e.target.value })}
                    className="bg-slate-950 font-mono text-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Port</Label>
                  <Input
                    value={config.Port}
                    onChange={(e) => setConfig({ ...config, Port: e.target.value })}
                    className="bg-slate-950 font-mono text-blue-400"
                  />
                </div>
              </div>

              {/* КНОПКА ПРОВЕРКИ */}
              <Button
                onClick={checkKkmStatus}
                disabled={testing}
                className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[9px] font-black h-9 flex gap-2"
              >
                {testing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                {testing ? "SCANNING NETWORK..." : "TEST CONNECTION"}
              </Button>
            </div>
          </Card>

          {/* Остальные карточки (Cashier Auth, Logic Flags и т.д. - оставь как в прошлом коде) */}
          {/* ... */}
        </div>

        {/* Здесь должен идти остальной код таблиц и параметров из предыдущего сообщения */}
      </div>
    </div>
  );
}
