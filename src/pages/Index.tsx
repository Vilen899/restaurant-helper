import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PinLogin from "./pages/PinLogin";
import Auth from "./pages/Auth";
import Cashier from "./pages/Cashier";
import CustomerDisplay from "./pages/CustomerDisplay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" closeButton richColors />
      <BrowserRouter>
        <Routes>
          {/* Главный вход */}
          <Route path="/" element={<Index />} />

          {/* Страница логина с ПИН-кодом */}
          <Route path="/pin-login" element={<PinLogin />} />

          {/* Админка / Авторизация */}
          <Route path="/auth" element={<Auth />} />

          {/* Интерфейс кассира */}
          <Route path="/cashier" element={<Cashier />} />

          {/* Экран для клиента */}
          <Route path="/customer-display" element={<CustomerDisplay />} />

          {/* Ошибка 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
