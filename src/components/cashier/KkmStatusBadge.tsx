import { useState, useEffect } from "react";
import { Cloud, Monitor, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { callFiscal, getFiscalMode, setFiscalMode, type FiscalMode } from "@/lib/fiscalApi";

interface KkmStatusBadgeProps {
  locationId?: string;
}

export function KkmStatusBadge({ locationId }: KkmStatusBadgeProps) {
  const [mode, setMode] = useState<FiscalMode>(getFiscalMode());
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;

    async function autoDetect() {
      setStatus("checking");

      // Try current mode first
      try {
        const result = await callFiscal("test_connection", locationId);
        if (!cancelled && result.success) {
          setStatus("online");
          return;
        }
      } catch {}

      // If cloud failed, try local; if local failed, try cloud
      const altMode: FiscalMode = mode === "cloud" ? "local" : "cloud";
      try {
        // Temporarily switch
        setFiscalMode(altMode);
        const result = await callFiscal("test_connection", locationId);
        if (!cancelled && result.success) {
          setMode(altMode);
          setStatus("online");
          return;
        }
      } catch {}

      // Restore original if alt also failed
      if (!cancelled) {
        setFiscalMode(mode);
        setStatus("offline");
      }
    }

    autoDetect();
    return () => { cancelled = true; };
  }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ModeIcon = mode === "cloud" ? Cloud : Monitor;
  const modeLabel = mode === "cloud" ? "Облако" : "Локальный";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={
              status === "online"
                ? "justify-center text-emerald-400 border-emerald-500/50 gap-1"
                : status === "offline"
                ? "justify-center text-red-400 border-red-500/50 gap-1"
                : "justify-center text-yellow-400 border-yellow-500/50 gap-1"
            }
          >
            {status === "checking" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : status === "online" ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            <ModeIcon className="w-3 h-3" />
            ККМ {modeLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "online" && `ККМ подключена (${modeLabel} режим)`}
            {status === "offline" && "ККМ недоступна. Чеки будут напечатаны при восстановлении связи."}
            {status === "checking" && "Проверка подключения к ККМ..."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
