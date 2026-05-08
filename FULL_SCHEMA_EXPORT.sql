-- COMPLETE SCHEMA EXPORT FOR HOSTINGER VPS DEPLOYMENT
-- Run this script in your Supabase SQL Editor on your self-hosted instance.

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'employee',
    emp_code TEXT,
    designation TEXT,
    "DOJ" TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create profile when auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'employee'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT,
    description TEXT,
    status TEXT,
    progress INTEGER DEFAULT 0,
    deadline DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    priority TEXT,
    deadline DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT,
    comment TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 4. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    author TEXT,
    text TEXT,
    type TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID,
    user_name TEXT,
    action TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 6. PAYMENT STAGES
CREATE TABLE IF NOT EXISTS public.payment_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_name TEXT,
    amount NUMERIC,
    amount_received NUMERIC DEFAULT 0,
    status TEXT,
    due_date DATE,
    received_date DATE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 7. VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    contact_person_name TEXT,
    phone_no TEXT,
    pan_card_no TEXT,
    gst_no TEXT,
    services_list TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 8. VENDOR ORDERS
CREATE TABLE IF NOT EXISTS public.vendor_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    order_date DATE,
    order_details TEXT,
    terms TEXT,
    total_amount NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    status TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 9. PROJECT CHECKLISTS
CREATE TABLE IF NOT EXISTS public.project_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    stage TEXT,
    category TEXT,
    task_name TEXT,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 10. PROJECT FILES
CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 12. PETTY CASH
CREATE TABLE IF NOT EXISTS public.petty_cash (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE,
    project_name TEXT,
    category TEXT,
    bill_name TEXT,
    reason TEXT,
    advance_amount NUMERIC DEFAULT 0,
    expenditure_amount NUMERIC DEFAULT 0,
    raised_by_name TEXT,
    raised_by_id UUID,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 13. ASSET MANAGEMENT
CREATE TABLE IF NOT EXISTS public.asset_management (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value NUMERIC(15, 2) NOT NULL,
    purchase_date DATE,
    maturity_date DATE,
    interest_rate NUMERIC(5, 2),
    details TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active'
);


-- 14. WORKSPACE SETTINGS
CREATE TABLE IF NOT EXISTS public.workspace_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_name TEXT,
    logo_url TEXT,
    full_logo_url TEXT,
    accent_color TEXT DEFAULT 'indigo',
    dashboard_style TEXT DEFAULT 'shadow',
    is_colorful BOOLEAN DEFAULT true,
    theme_mode TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- To keep things simple and functional for initial load, we enable RLS but give full access to authenticated users.
-- You can tighten these policies later in Supabase Studio.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.projects FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.comments FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.payment_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.payment_stages FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.vendors FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.vendor_orders FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.project_checklists FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.project_files FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.notifications FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.petty_cash FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.asset_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.asset_management FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.workspace_settings FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project_files', 'project_files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Give users authenticated access to folder" ON storage.objects
FOR ALL USING (auth.role() = 'authenticated');
