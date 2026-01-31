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
  Trash2,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 1. СТРОГОЕ СООТВЕТСТВИЕ СТРУКТУРЕ XML
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
  SubchargeAsDishName: "Հանրային սննդи կազմակերպում",
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
  PaymentTypes: [
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
  ],
};

export default function FiscalSettingsPage() {
  const [config, setConfig] = useState({ ...XML_DEFAULTS, location_id: "" });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const { data } = await supabase.from("fiscal_settings").select("*").eq("location_id", locId).maybeSingle();
    if (data) {
      setConfig({ ...XML_DEFAULTS, ...data, location_id: locId });
    } else {
      setConfig({ ...XML_DEFAULTS, location_id: locId });
    }
    setLoading(false);
  }

  const save = async () => {
    const { error } = await supabase.from("fiscal_settings").upsert(
      {
        ...config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id" },
    );
    if (!error) toast.success("Данные синхронизированы 1:1 с XML");
    else toast.error(error.message);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-emerald-500 uppercase italic">
        Parsing_XML_Config...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* HEADER PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/20">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">HDM Driver Manifest</h1>
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

        {/* SECTION 1: NETWORK & AUTH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-blue-500 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-blue-500">
              <Wifi className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Connection</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">Host</Label>
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
              <div className="space-y-1">
                <Label className="text-[9px] text-slate-500 uppercase italic">KkmPassword</Label>
                <Input
                  value={config.KkmPassword}
                  onChange={(e) => setConfig({ ...config, KkmPassword: e.target.value })}
                  className="bg-slate-950 text-emerald-500"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-emerald-500 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-emerald-500">
              <Lock className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Cashier Auth</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">CashierId</Label>
                  <Input
                    value={config.CashierId}
                    onChange={(e) => setConfig({ ...config, CashierId: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">CashierPin</Label>
                  <Input
                    value={config.CashierPin}
                    onChange={(e) => setConfig({ ...config, CashierPin: e.target.value })}
                    className="bg-slate-950 h-9"
                  />
                </div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-400">Vat Rate (%)</span>
                <Input
                  type="number"
                  value={config.VatRate}
                  onChange={(e) => setConfig({ ...config, VatRate: parseFloat(e.target.value) })}
                  className="w-20 bg-transparent border-none text-right font-black text-emerald-500 h-6 p-0 focus:ring-0"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl border-t-2 border-t-amber-500 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-amber-500">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Logic Flags</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Discount", key: "UseDiscountInKkm" },
                { label: "Subcharge", key: "UseSubchargeAsDish" },
                { label: "Kitchen", key: "UseKitchenName" },
                { label: "Def. ADG", key: "UseDefaultAdg" },
              ].map((f) => (
                <div
                  key={f.key}
                  className="flex flex-col gap-2 p-2 bg-black/30 rounded-lg border border-slate-800 items-center"
                >
                  <span className="text-[8px] font-black uppercase text-slate-500">{f.label}</span>
                  <Switch checked={config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SECTION 2: SUBCHARGE AS DISH (SPECIAL) */}
        <Card className="bg-slate-900/30 border-slate-800 p-6 rounded-2xl shadow-xl border-l-4 border-l-amber-600">
          <div className="flex items-center gap-2 mb-6 text-amber-500">
            <Zap className="h-4 w-4" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Subcharge Details (Հանրային սնունդ)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase">Name</Label>
              <Input
                value={config.SubchargeAsDishName}
                onChange={(e) => setConfig({ ...config, SubchargeAsDishName: e.target.value })}
                className="bg-slate-950 text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase">ADG Code</Label>
              <Input
                value={config.SubchargeAsDishAdgCode}
                onChange={(e) => setConfig({ ...config, SubchargeAsDishAdgCode: e.target.value })}
                className="bg-slate-950 font-bold text-amber-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase">Dish Code</Label>
              <Input
                value={config.SubchargeAsDishCode}
                onChange={(e) => setConfig({ ...config, SubchargeAsDishCode: e.target.value })}
                className="bg-slate-950"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase">Unit</Label>
              <Input
                value={config.SubchargeAsDishUnit}
                onChange={(e) => setConfig({ ...config, SubchargeAsDishUnit: e.target.value })}
                className="bg-slate-950"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 3: PAYMENT TYPES TABLE */}
        <Card className="bg-slate-900/20 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Types Registry
            </div>
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-black/60 text-slate-500 font-bold uppercase text-[9px]">
              <tr>
                <th className="p-4 text-left">Display Name</th>
                <th className="p-4 text-left">Internal UUID</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-center">External POS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {config.PaymentTypes.map((pt, idx) => (
                <tr key={idx} className="hover:bg-emerald-900/5 transition-colors">
                  <td className="p-4 font-bold text-white italic">{pt.Name}</td>
                  <td className="p-4 font-mono text-slate-500 text-[10px]">{pt.Id}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-950 text-blue-400 rounded-md font-bold text-[9px] uppercase">
                      {pt.PaymentType}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={pt.UseExtPos}
                      onCheckedChange={(v) => {
                        const upd = [...config.PaymentTypes];
                        upd[idx].UseExtPos = v;
                        setConfig({ ...config, PaymentTypes: upd });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* SECTION 4: SYSTEM PARAMS & TIMEOUTS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-xl">
            <div className="text-[8px] font-black uppercase text-slate-500 mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Timeouts
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] uppercase">Op Timeout</Label>
                <Input
                  type="number"
                  value={config.DefaultOperationTimeout}
                  onChange={(e) => setConfig({ ...config, DefaultOperationTimeout: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
              <div>
                <Label className="text-[8px] uppercase">KKM Timeout</Label>
                <Input
                  type="number"
                  value={config.KkmPaymentTimeout}
                  onChange={(e) => setConfig({ ...config, KkmPaymentTimeout: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-xl">
            <div className="text-[8px] font-black uppercase text-slate-500 mb-2 flex items-center gap-1">
              <Activity className="h-3 w-3" /> System
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] uppercase">Backup Limit</Label>
                <Input
                  type="number"
                  value={config.BackupDaysLimit}
                  onChange={(e) => setConfig({ ...config, BackupDaysLimit: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
              <div>
                <Label className="text-[8px] uppercase">Relogin Count</Label>
                <Input
                  type="number"
                  value={config.CounterToRelogin}
                  onChange={(e) => setConfig({ ...config, CounterToRelogin: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-xl">
            <div className="text-[8px] font-black uppercase text-slate-500 mb-2 flex items-center gap-1">
              <Database className="h-3 w-3" /> ADG Length
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[8px] uppercase">Code Length</Label>
                <Input
                  type="number"
                  value={config.AdgCodeFromProductCodeLength}
                  onChange={(e) => setConfig({ ...config, AdgCodeFromProductCodeLength: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
              <div>
                <Label className="text-[8px] uppercase">Fast Length</Label>
                <Input
                  type="number"
                  value={config.AdgCodeFromProductFastCodeLength}
                  onChange={(e) => setConfig({ ...config, AdgCodeFromProductFastCodeLength: parseInt(e.target.value) })}
                  className="h-8 bg-slate-950"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/30 border-slate-800 p-5 rounded-xl">
            <div className="text-[8px] font-black uppercase text-slate-500 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Advanced
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-1">
                <span className="text-[8px] font-bold uppercase">C16 Transfer</span>
                <Switch
                  checked={config.C16CardIdTransfer}
                  onCheckedChange={(v) => setConfig({ ...config, C16CardIdTransfer: v })}
                />
              </div>
              <div className="flex justify-between items-center p-1">
                <span className="text-[8px] font-bold uppercase">Cash I/O</span>
                <Switch
                  checked={config.DisableCashInOut}
                  onCheckedChange={(v) => setConfig({ ...config, DisableCashInOut: v })}
                />
              </div>
              <div className="flex justify-between items-center p-1">
                <span className="text-[8px] font-bold uppercase">Debug Mode</span>
                <Input
                  value={config.DebugMode}
                  onChange={(e) => setConfig({ ...config, DebugMode: parseInt(e.target.value) })}
                  className="w-10 h-6 bg-transparent p-0 text-right border-none font-bold"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* BOTTOM FLAGS (REPORTS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Do X Report", key: "DoXReport" },
            { label: "Do Z Report", key: "DoZReport" },
            { label: "Kitchen Dept", key: "UseDepartmentFromKitchenName" },
            { label: "Manual Mode", key: "Mode", isText: true },
          ].map((f) => (
            <div
              key={f.key}
              className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{f.label}</span>
              {f.isText ? (
                <span className="text-[9px] font-bold text-white italic">{config[f.key]}</span>
              ) : (
                <Switch checked={config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
