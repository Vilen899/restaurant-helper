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

// Admin pages
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import MenuPage from "./pages/admin/Menu";
import RecipesPage from "./pages/admin/Recipes";
import SemiFinishedPage from "./pages/admin/SemiFinished";
import IngredientsPage from "./pages/admin/Ingredients";
import InventoryPage from "./pages/admin/Inventory";
import LocationsPage from "./pages/admin/Locations";
import StaffPage from "./pages/admin/Staff";
import CategoriesPage from "./pages/admin/Categories";
import ReportsPage from "./pages/admin/Reports";
import InventoryReportPage from "./pages/admin/InventoryReport";
import PaymentMethodsPage from "./pages/admin/PaymentMethods";
import DocumentsPage from "./pages/admin/Documents";
import WorkTimePage from "./pages/admin/WorkTime";
import FiscalSettingsPage from "./pages/admin/FiscalSettings";
import DiscountsPage from "./pages/admin/Discounts";
import CustomerDisplaySettingsPage from "./pages/admin/CustomerDisplaySettings";
import CustomerDisplayPage from "./pages/CustomerDisplay";
const queryClient = new QueryClient();

// Wrapper component to use hooks inside BrowserRouter
function AppRoutes() {
  useManifest();
  
  return (
    <Routes>
      {/* Cashier routes */}
      <Route path="/" element={<PinLogin />} />
      <Route path="/pin" element={<PinLogin />} />
      <Route path="/cashier" element={<CashierPage />} />
      <Route path="/customer-display" element={<CustomerDisplayPage />} />
      
      {/* Admin auth */}
      <Route path="/admin/login" element={<Auth />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin', 'manager']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="semi-finished" element={<SemiFinishedPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="payment-methods" element={<PaymentMethodsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="work-time" element={<WorkTimePage />} />
        <Route path="fiscal-settings" element={<FiscalSettingsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="customer-display" element={<CustomerDisplaySettingsPage />} />
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
