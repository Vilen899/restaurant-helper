import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useManifest } from "@/hooks/useManifest";

// Базовые страницы
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PinLogin from "./pages/PinLogin";
import CashierPage from "./pages/Cashier";
import CustomerDisplayPage from "./pages/CustomerDisplay";

// Админка - Компоненты и Лейаут
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";

// Админка - Склад и Номенклатура
import MenuPage from "./pages/admin/Menu";
import CategoriesPage from "./pages/admin/Categories";
import RecipesPage from "./pages/admin/Recipes";
import SemiFinishedPage from "./pages/admin/SemiFinished";
import IngredientsPage from "./pages/admin/Ingredients";
import InventoryPage from "./pages/admin/Inventory";
import GoodsReceiptPage from "./pages/admin/GoodsReceipt";
import MaterialDocsPage from "./pages/admin/MaterialDocs";
import StockTransferPage from "./pages/admin/StockTransfer";
import StocktakingDocsPage from "./pages/admin/StocktakingDocs";

// Админка - Персонал и Настройки
import StaffPage from "./pages/admin/Staff";
import WorkTimePage from "./pages/admin/WorkTime";
import LocationsPage from "./pages/admin/Locations";
import PaymentMethodsPage from "./pages/admin/PaymentMethods";
import DiscountsPage from "./pages/admin/Discounts";
import ReportsPage from "./pages/admin/Reports";
import InventoryReportPage from "./pages/admin/InventoryReport";
import NegativeSalesReportPage from "./pages/admin/NegativeSalesReport";
import CashierSettingsPage from "./pages/admin/CashierSettings";
import FiscalSettingsPage from "./pages/admin/FiscalSettings";

const queryClient = new QueryClient();

function AppRoutes() {
  useManifest();

  return (
    <Routes>
      {/* ПУБЛИЧНЫЕ И КАССОВЫЕ РОУТЫ */}
      <Route path="/" element={<PinLogin />} />
      <Route path="/pin" element={<PinLogin />} />
      <Route path="/cashier" element={<CashierPage />} />
      <Route path="/customer-display" element={<CustomerDisplayPage />} />
      <Route path="/admin/login" element={<Auth />} />

      {/* АДМИН-ПАНЕЛЬ С ЗАЩИТОЙ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />

        {/* НОМЕНКЛАТУРА */}
        <Route path="menu" element={<MenuPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="semi-finished" element={<SemiFinishedPage />} />

        {/* СКЛАД (MIGO) */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="migo" element={<GoodsReceiptPage />} />
        <Route path="transfer" element={<StockTransferPage />} />
        <Route path="material-docs" element={<MaterialDocsPage />} />
        <Route path="stocktaking-docs" element={<StocktakingDocsPage />} />

        {/* ПЕРСОНАЛ И БИЗНЕС */}
        <Route path="staff" element={<StaffPage />} />
        <Route path="work-time" element={<WorkTimePage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="payment-methods" element={<PaymentMethodsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />

        {/* ОТЧЕТЫ И СИСТЕМА */}
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="reports/negative-sales" element={<NegativeSalesReportPage />} />
        <Route path="cashier-settings" element={<CashierSettingsPage />} />
        <Route path="fiscal-settings" element={<FiscalSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ОСНОВНОЙ КОМПОНЕНТ APP
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
