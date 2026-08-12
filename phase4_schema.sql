-- Run this script in your Supabase SQL Editor to apply Phase 4 updates.

-- Add kiosk_passcode to organizations table (defaults to '1234')
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS kiosk_passcode VARCHAR(4) NOT NULL DEFAULT '1234';
