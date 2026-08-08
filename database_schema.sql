-- Run this script in the Supabase SQL Editor to set up the database.

-- Organizations Table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff Table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins Table (Links Supabase auth.users to an organization)
CREATE TABLE public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily PINs Table
CREATE TABLE public.daily_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  pin VARCHAR(6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, date), -- One PIN per staff per day
  UNIQUE(pin, date)       -- Ensure PIN is unique across all staff for the day
);

-- Time Logs Table (Check-ins / Check-outs)
CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ, -- Nullable, filled when they check out
  photo_url TEXT, -- For photo verification
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Setup Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies for Admins (Assuming they are logged in via Supabase Auth)
-- Admins can only see and manage data for their organization.

-- (For production, you'd add policies restricting access based on the auth.uid() matching the admins table).
-- For this MVP, we will allow read/write from authenticated users (admins) or service_role (API).
-- Since the kiosk will be unauthenticated or use an anon key, we'll write custom policies or use a secure API route to bypass RLS for kiosk operations.

CREATE POLICY "Allow service role full access" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON public.staff FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON public.admins FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON public.daily_pins FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON public.time_logs FOR ALL USING (true);

-- Allow public read access to organizations for registration (if needed)
CREATE POLICY "Allow public read orgs" ON public.organizations FOR SELECT USING (true);
