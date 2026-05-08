-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Fix workspace_settings missing columns from manual schema creation
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'indigo';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS dashboard_style TEXT DEFAULT 'shadow';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS is_colorful BOOLEAN DEFAULT true;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS full_logo_url TEXT;

-- Enable Row Level Security on all tables
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

-- If profiles table exists from previous scripts, enable it too
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies allowing ALL authenticated users full access
-- (You can tighten these up in the Supabase Studio later based on roles)
CREATE POLICY "Enable ALL access for auth users" ON public.workspace_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.vendors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.asset_management FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.notifications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.payment_stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.project_checklists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.petty_cash FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.project_files FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL access for auth users" ON public.vendor_orders FOR ALL USING (auth.role() = 'authenticated');

-- CREATE POLICY "Enable ALL access for auth users" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');


-- ==========================================
-- SAMPLE SEED DATA
-- ==========================================

DO $$
DECLARE
    project1_id UUID := gen_random_uuid();
    project2_id UUID := gen_random_uuid();
    vendor1_id UUID := gen_random_uuid();
    vendor2_id UUID := gen_random_uuid();
BEGIN
    -- Insert Workspace Setting
    INSERT INTO public.workspace_settings (workspace_name, is_colorful, theme_mode)
    VALUES ('ArchOffice Development', true, 'light');

    -- Insert Vendors
    INSERT INTO public.vendors (id, vendor_name, contact_person_name, phone_no, services_list)
    VALUES 
        (vendor1_id, 'TechCorp Supplies', 'Alice Smith', '+91 9876543210', 'Hardware, IT Materials'),
        (vendor2_id, 'BuildRight Inc.', 'Bob Jones', '+91 9123456789', 'Construction, Labor, Concrete');

    -- Insert Projects
    INSERT INTO public.projects (id, name, client_name, description, status, progress, assigned_to)
    VALUES 
        (project1_id, 'Modern Villa Construction', 'John Doe', 'A 3-story modern villa in Jubilee Hills.', 'Construction', 45, 'Team A'),
        (project2_id, 'City Plaza Renovation', 'City Council', 'Renovation of central plaza.', 'Design', 10, 'Team B');

    -- Insert Tasks
    INSERT INTO public.tasks (project_id, title, description, status, priority)
    VALUES 
        (project1_id, 'Foundation Work', 'Lay the foundation for the villa.', 'In Progress', 'High'),
        (project1_id, 'Roofing', 'Install the roof once structure is done.', 'Todo', 'Medium'),
        (project2_id, 'Initial Designs', 'Draft 3 initial designs for the plaza upgrade.', 'Completed', 'High');

    -- Insert Payment Stages
    INSERT INTO public.payment_stages (project_id, stage_name, amount, status, amount_received)
    VALUES 
        (project1_id, 'Advance', 500000, 'Received', 500000),
        (project1_id, 'Foundation Complete', 1000000, 'Pending', 0),
        (project2_id, 'Design Approval', 300000, 'Pending', 0);

    -- Insert Vendor Orders
    INSERT INTO public.vendor_orders (project_id, vendor_id, order_details, total_amount, status)
    VALUES 
        (project1_id, vendor1_id, 'Cement and steel structures for Phase 1.', 250000, 'Pending'),
        (project2_id, vendor2_id, 'Design consultation tools and modeling software.', 50000, 'Completed');

    -- Insert Asset Management
    INSERT INTO public.asset_management (type, name, value, details)
    VALUES 
        ('asset', 'Company Laptops (Batch A)', 450000, '10 Apple MacBook Pro M2'),
        ('fd', 'HDFC Fixed Deposit', 1000000, 'Corporate flexi FD 6.5% interest');

END $$;
