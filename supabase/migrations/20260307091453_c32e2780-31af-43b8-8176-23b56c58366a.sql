
CREATE TABLE public.pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  ip_address text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read (edge function uses service role)
-- No public policies needed

CREATE INDEX idx_pin_attempts_location_time ON public.pin_attempts (location_id, attempted_at);

-- Auto-cleanup old records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_pin_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.pin_attempts WHERE attempted_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_pin_attempts
AFTER INSERT ON public.pin_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_pin_attempts();
