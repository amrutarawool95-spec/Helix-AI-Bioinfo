ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS deep_dive TEXT,
  ADD COLUMN IF NOT EXISTS common_pitfalls JSONB,
  ADD COLUMN IF NOT EXISTS further_reading JSONB;