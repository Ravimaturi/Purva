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

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL access for authenticated users to workspace_settings"
    ON public.workspace_settings
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
