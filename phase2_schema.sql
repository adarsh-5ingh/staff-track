-- Run this script in your Supabase SQL Editor to apply Phase 2 updates.

-- 1. Add shift_start_time to organizations (defaults to 9:00 AM)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS shift_start_time TIME NOT NULL DEFAULT '09:00:00';

-- 2. Create leaves table
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Setup RLS for leaves table
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access on leaves" ON public.leaves FOR ALL USING (true);
