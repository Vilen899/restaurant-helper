// ... (все твои импорты остаются прежними)
// Проверь, что импорт MovementJournalPage на месте:
import MovementJournalPage from "./pages/admin/MovementJournal";

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
        <Route path="cashier-settings" element={<CashierSettingsPage />} />
        <Route path="reports/negative-sales" element={<NegativeSalesReportPage />} />

        {/* Warehouse docs & Logistics */}
        <Route path="goods-receipt" element={<GoodsReceiptPage />} />
        <Route path="migo" element={<GoodsReceiptPage />} />

        <Route path="material-docs" element={<MaterialDocsPage />} />

        <Route path="stock-transfer" element={<StockTransferPage />} />
        <Route path="transfer" element={<StockTransferPage />} />

        {/* ИСПРАВЛЕНИЕ ТУТ: Добавляем маршрут для истории/журнала */}
        <Route path="material-log" element={<MovementJournalPage />} />
        <Route path="movement-journal" element={<MovementJournalPage />} />

        <Route path="supply-docs" element={<SupplyDocsPage />} />
        <Route path="stocktaking-docs" element={<StocktakingDocsPage />} />
        <Route path="transfer-docs" element={<TransferDocsPage />} />
        <Route path="physical-inventory" element={<PhysicalInventoryPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
// ... остальной код App (Provider-ы) остается без изменений
