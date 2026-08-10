-- Run this script in your Supabase SQL Editor to apply Phase 3 updates.

-- Add shift_start_time to the staff table for individual tracking.
-- Defaults to 9:00 AM for all existing staff.
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS shift_start_time TIME NOT NULL DEFAULT '09:00:00';
