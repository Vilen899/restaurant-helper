import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PinLogin from "./pages/PinLogin";
import CashierPage from "./pages/Cashier";

// Admin pages
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import MenuPage from "./pages/admin/Menu";
import RecipesPage from "./pages/admin/Recipes";
import IngredientsPage from "./pages/admin/Ingredients";
import InventoryPage from "./pages/admin/Inventory";
import LocationsPage from "./pages/admin/Locations";
import StaffPage from "./pages/admin/Staff";
import CategoriesPage from "./pages/admin/Categories";
import ReportsPage from "./pages/admin/Reports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Cashier routes */}
            <Route path="/" element={<PinLogin />} />
            <Route path="/pin" element={<PinLogin />} />
            <Route path="/cashier" element={<CashierPage />} />
            
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
              <Route path="ingredients" element={<IngredientsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
