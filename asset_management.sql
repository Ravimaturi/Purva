CREATE TABLE IF NOT EXISTS public.asset_management (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'asset', 'fd', 'loan'
    name VARCHAR(255) NOT NULL,
    value NUMERIC(15, 2) NOT NULL,
    purchase_date DATE,
    maturity_date DATE, -- For FDs and Loans
    interest_rate NUMERIC(5, 2), -- For FDs and Loans
    details TEXT, -- Extra details or JSON string
    file_url TEXT, -- OneDrive URL for photo/document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active'
);

ALTER TABLE public.asset_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
    ON public.asset_management FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" 
    ON public.asset_management FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" 
    ON public.asset_management FOR UPDATE 
    USING (auth.role() = 'authenticated');
    
CREATE POLICY "Enable delete for authenticated users" 
    ON public.asset_management FOR DELETE 
    USING (auth.role() = 'authenticated');
