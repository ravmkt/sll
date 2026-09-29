ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id);
