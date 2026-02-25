import { useState, useEffect, useRef, useCallback } from "react";
import { Cloud, Monitor, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { callFiscal, getFiscalMode, setFiscalMode, type FiscalMode } from "@/lib/fiscalApi";
import { playKkmDisconnectSound, playKkmReconnectSound } from "@/lib/sounds";

interface KkmStatusBadgeProps {
  locationId?: string;
}

const POLL_INTERVAL = 30_000; // re-check every 30s

export function KkmStatusBadge({ locationId }: KkmStatusBadgeProps) {
  const [mode, setMode] = useState<FiscalMode>(getFiscalMode());
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const prevStatusRef = useRef<"online" | "offline" | null>(null);
  const [tick, setTick] = useState(0);

  const detect = useCallback(async (currentMode: FiscalMode, cancelled: { value: boolean }) => {
    setStatus("checking");

    // Try current mode
    try {
      const result = await callFiscal("test_connection", locationId);
      if (!cancelled.value && result.success) {
        return "online" as const;
      }
    } catch {}

    // Try alternative
    const altMode: FiscalMode = currentMode === "cloud" ? "local" : "cloud";
    try {
      setFiscalMode(altMode);
      const result = await callFiscal("test_connection", locationId);
      if (!cancelled.value && result.success) {
        setMode(altMode);
        return "online" as const;
      }
    } catch {}

    // Restore original
    if (!cancelled.value) {
      setFiscalMode(currentMode);
    }
    return "offline" as const;
  }, [locationId]);

  useEffect(() => {
    const cancelled = { value: false };

    detect(mode, cancelled).then((newStatus) => {
      if (cancelled.value) return;

      // Play sound on transition
      const prev = prevStatusRef.current;
      if (prev === "online" && newStatus === "offline") {
        playKkmDisconnectSound();
      } else if (prev === "offline" && newStatus === "online") {
        playKkmReconnectSound();
      }

      prevStatusRef.current = newStatus;
      setStatus(newStatus);
    });

    return () => { cancelled.value = true; };
  }, [locationId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic polling
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleSwitchMode = (newMode: FiscalMode) => {
    setFiscalMode(newMode);
    setMode(newMode);
    setTick((t) => t + 1); // trigger re-check
  };

  const ModeIcon = mode === "cloud" ? Cloud : Monitor;
  const modeLabel = mode === "cloud" ? "Облако" : "Локальный";

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={
                  `cursor-pointer ${
                    status === "online"
                      ? "justify-center text-emerald-400 border-emerald-500/50 gap-1"
                      : status === "offline"
                      ? "justify-center text-red-400 border-red-500/50 gap-1"
                      : "justify-center text-yellow-400 border-yellow-500/50 gap-1"
                  }`
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
                ККМ
              </Badge>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>
            <p>
              {status === "online" && `ККМ подключена (${modeLabel} режим). Нажмите для переключения.`}
              {status === "offline" && "ККМ недоступна. Нажмите для переключения режима."}
              {status === "checking" && "Проверка подключения к ККМ..."}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Режим ККМ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleSwitchMode("cloud")}
          className={mode === "cloud" ? "bg-accent" : ""}
        >
          <Cloud className="w-4 h-4 mr-2" />
          Облачный
          {mode === "cloud" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSwitchMode("local")}
          className={mode === "local" ? "bg-accent" : ""}
        >
          <Monitor className="w-4 h-4 mr-2" />
          Локальный
          {mode === "local" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTick((t) => t + 1)}>
          <Loader2 className="w-4 h-4 mr-2" />
          Проверить связь
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
