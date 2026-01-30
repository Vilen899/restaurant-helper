function AppRoutes() {
  useManifest();

  return (
    <Routes>
      {/* FRONT OFFICE */}
      <Route path="/" element={<PinLogin />} />
      <Route path="/cashier" element={<CashierPage />} />
      <Route path="/customer-display" element={<CustomerDisplayPage />} />
      <Route path="/admin/login" element={<Auth />} />

      {/* BACK OFFICE (ADMIN) */}
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
        <Route path="inventory" element={<InventoryPage />} /> {/* Текущие остатки */}
        <Route path="migo" element={<GoodsReceiptPage />} /> {/* Поступление товара */}
        <Route path="transfer" element={<StockTransferPage />} /> {/* Перемещение */}
        <Route path="material-docs" element={<MaterialDocsPage />} /> {/* Общий журнал (Приход/Расход) */}
        <Route path="stocktaking-docs" element={<StocktakingDocsPage />} /> {/* Журнал инвентаризаций */}
        {/* ПЕРСОНАЛ И НАСТРОЙКИ */}
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
