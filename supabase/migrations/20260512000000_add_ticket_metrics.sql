ALTER TABLE tickets_cache
  ADD COLUMN IF NOT EXISTS tme_minutos integer,
  ADD COLUMN IF NOT EXISTS frt_minutos integer,
  ADD COLUMN IF NOT EXISTS abandonado boolean DEFAULT false;
