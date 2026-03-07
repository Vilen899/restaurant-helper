

## Plan: Fix FiscalSettings -- Location Selector, Save Fix, Test Timeout

### 1. Add Location Selector (dropdown to switch between locations)

In `FiscalSettings.tsx`, add a `Select` component (from `@/components/ui/select`) at the top of the page, between the header and tabs. It will:
- Show all loaded locations from the `locations` state
- On change, call `loadSettings(selectedLocationId)` to reload fiscal config for that location
- Track the selected location in state

### 2. Fix Save Button

The current `handleSave` does `supabase.from("fiscal_settings").upsert({...config})` which spreads the entire config object including XML_DEFAULTS fields that don't exist as DB columns. This will cause errors.

Fix: Filter config to only include fields that match the `fiscal_settings` table schema before upserting. Ensure `location_id` is set as the conflict key.

### 3. Add 15-second Timeout for Cloud Test Connection

In `handleTestConnection`, wrap the `callFiscal` call with a `Promise.race` using a 15-second timeout. On timeout, show a clear error message like "ККМ не отвечает (таймаут 15 сек). Проверьте доступность оборудования."

Also set `isTesting = false` on timeout.

### 4. Fix `callFiscal` call signature

Line 144: `callFiscal("test_connection", config.location_id, fiscalMode)` passes `fiscalMode` as the third argument which maps to `orderData` in the function signature. This is wrong -- `fiscalMode` is not order data. Remove the third argument since `callFiscal` already reads mode from localStorage.

### Files to Change

**`src/pages/admin/FiscalSettings.tsx`**:
- Add `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` imports
- Add `selectedLocationId` state, initialize from first loaded location
- Add location dropdown UI between header and tabs
- Fix `handleSave` to filter config fields to match DB columns
- Fix `handleTestConnection` -- remove `fiscalMode` arg, add 15s timeout wrapper
- Add `MapPin` icon import from lucide-react

**`src/lib/fiscalApi.ts`**: No changes needed (already has correct signature).

