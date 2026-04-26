-- Run this in your Supabase SQL Editor to allow users to update their Petty Cash Entries

-- First, ensure that the table has row level security enabled
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;

-- Add policy to allow users to update their own entries or admins to update any entry
CREATE POLICY "Enable update for users based on id" 
ON petty_cash 
FOR UPDATE 
USING (
  auth.uid() = raised_by_id OR 
  auth.role() = 'service_role' OR
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'chief_sthapathy', 'finance_manager'))
)
WITH CHECK (
  auth.uid() = raised_by_id OR 
  auth.role() = 'service_role' OR
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'chief_sthapathy', 'finance_manager'))
);

-- Additionally, it might be good to allow everyone to update or just have a simpler policy if you want a more open approach:
-- CREATE POLICY "Enable update for authenticated users" ON petty_cash FOR UPDATE USING (auth.role() = 'authenticated');
