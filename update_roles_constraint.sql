-- Fix for adding new roles inside Supabase
-- Run this in your Supabase project's SQL Editor

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'chief_sthapathy', 'deputy_sthapathy', 'assistant_sthapathy', 'junior_sthapathy', 'finance_manager', 'employee'));
