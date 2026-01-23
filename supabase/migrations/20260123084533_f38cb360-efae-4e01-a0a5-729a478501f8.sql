-- Add HDM-specific fields for Armenian fiscal printers (ISP930 and others)
ALTER TABLE public.fiscal_settings
  ADD COLUMN IF NOT EXISTS kkm_password text,
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS terminal_id text,
  ADD COLUMN IF NOT EXISTS default_timeout integer DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS payment_timeout integer DEFAULT 120000;

-- Add comment for documentation
COMMENT ON COLUMN public.fiscal_settings.kkm_password IS 'KKM password for HDM devices';
COMMENT ON COLUMN public.fiscal_settings.vat_rate IS 'VAT rate percentage (e.g. 16.67 for Armenia)';
COMMENT ON COLUMN public.fiscal_settings.terminal_id IS 'POS Terminal ID for fiscal registration';
COMMENT ON COLUMN public.fiscal_settings.default_timeout IS 'Default operation timeout in milliseconds';
COMMENT ON COLUMN public.fiscal_settings.payment_timeout IS 'Payment operation timeout in milliseconds';