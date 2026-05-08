-- Add the status field to the asset_management table if it is missing
ALTER TABLE public.asset_management 
ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active'::character varying;

-- Ensure RLS is still intact
ALTER TABLE public.asset_management ENABLE ROW LEVEL SECURITY;
