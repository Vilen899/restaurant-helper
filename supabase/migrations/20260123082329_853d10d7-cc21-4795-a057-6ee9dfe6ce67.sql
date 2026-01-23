-- Create fiscal_settings table to store POS/fiscal printer configurations
CREATE TABLE public.fiscal_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    driver TEXT NOT NULL DEFAULT 'custom', -- atol, shtrih, evotor, custom
    connection_type TEXT NOT NULL DEFAULT 'api', -- network, usb, api
    
    -- Network/API connection settings
    api_url TEXT, -- Full API URL for custom integrations (like Dines)
    ip_address TEXT,
    port TEXT DEFAULT '5555',
    
    -- Authentication
    api_login TEXT,
    api_password TEXT,
    api_token TEXT, -- For token-based auth
    
    -- Device info
    device_id TEXT,
    serial_number TEXT,
    
    -- Company details
    inn TEXT,
    operator_name TEXT,
    company_name TEXT,
    company_address TEXT,
    
    -- Print settings
    auto_print_receipt BOOLEAN NOT NULL DEFAULT true,
    print_copy BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(location_id) -- One config per location
);

-- Enable RLS
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage fiscal_settings" ON public.fiscal_settings
    FOR ALL TO authenticated
    USING (public.is_admin_or_manager(auth.uid()))
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view their location fiscal_settings" ON public.fiscal_settings
    FOR SELECT TO authenticated
    USING (location_id = public.get_user_location(auth.uid()) OR public.is_admin_or_manager(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_fiscal_settings_updated_at
    BEFORE UPDATE ON public.fiscal_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();