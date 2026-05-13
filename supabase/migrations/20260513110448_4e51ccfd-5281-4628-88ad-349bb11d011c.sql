ALTER TABLE public.tickets_cache
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS reaberto_em timestamptz,
  ADD COLUMN IF NOT EXISTS reaberto boolean DEFAULT false;