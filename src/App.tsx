import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useManifest } from "@/hooks/useManifest";

// Pages
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PinLogin from "./pages/PinLogin";
import CashierPage from "./pages/Cashier";
import CustomerDisplayPage from "./pages/CustomerDisplay";

// Admin pages
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import MenuPage from "./pages/admin/Menu";
import RecipesPage from "./pages/admin/Recipes";
import SemiFinishedPage from "./pages/admin/SemiFinished";
import IngredientsPage from "./pages/admin/Ingredients";
import InventoryPage from "./pages/admin/Inventory"; // ТА САМАЯ ЧИСТАЯ СТРАНИЦА
import LocationsPage from "./pages/admin/Locations";
import StaffPage from "./pages/admin/Staff";
import CategoriesPage from "./pages/admin/Categories";
import ReportsPage from "./pages/admin/Reports";
import InventoryReportPage from "./pages/admin/InventoryReport";
import PaymentMethodsPage from "./pages/admin/PaymentMethods";
import WorkTimePage from "./pages/admin/WorkTime";
import FiscalSettingsPage from "./pages/admin/FiscalSettings";
import DiscountsPage from "./pages/admin/Discounts";
import CashierSettingsPage from "./pages/admin/CashierSettings";
import NegativeSalesReportPage from "./pages/admin/NegativeSalesReport";
import MaterialDocsPage from "./pages/admin/MaterialDocs";

const queryClient = new QueryClient();

function AppRoutes() {
  useManifest();

  return (
    <Routes>
      <Route path="/" element={<PinLogin />} />
      <Route path="/pin" element={<PinLogin />} />
      <Route path="/cashier" element={<CashierPage />} />
      <Route path="/customer-display" element={<CustomerDisplayPage />} />
      <Route path="/admin/login" element={<Auth />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="semi-finished" element={<SemiFinishedPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />

        {/* ВСЕ СКЛАДСКИЕ ПУТИ ТЕПЕРЬ ВЕДУТ НА ЧИСТУЮ СТРАНИЦУ ОСТАТКОВ */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="physical-inventory" element={<InventoryPage />} />
        <Route path="stock-transfer" element={<InventoryPage />} />
        <Route path="goods-receipt" element={<InventoryPage />} />
        <Route path="migo" element={<InventoryPage />} />

        <Route path="locations" element={<LocationsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="payment-methods" element={<PaymentMethodsPage />} />
        <Route path="work-time" element={<WorkTimePage />} />
        <Route path="fiscal-settings" element={<FiscalSettingsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="cashier-settings" element={<CashierSettingsPage />} />
        <Route path="reports/negative-sales" element={<NegativeSalesReportPage />} />
        <Route path="material-docs" element={<MaterialDocsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

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
