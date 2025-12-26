BEGIN;
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS traccar_device_id integer;
COMMENT ON COLUMN public.vehicles.traccar_device_id IS 'Traccar device id link';
CREATE INDEX IF NOT EXISTS idx_vehicles_traccar_device_id ON public.vehicles(traccar_device_id);
COMMIT;
