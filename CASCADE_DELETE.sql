-- Update foreign keys to cascade deletion when a project is deleted

-- Audit Logs
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_project_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Comments
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_project_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Payment Stages
ALTER TABLE public.payment_stages DROP CONSTRAINT IF EXISTS payment_stages_project_id_fkey;
ALTER TABLE public.payment_stages ADD CONSTRAINT payment_stages_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Project Checklists
ALTER TABLE public.project_checklists DROP CONSTRAINT IF EXISTS project_checklists_project_id_fkey;
ALTER TABLE public.project_checklists ADD CONSTRAINT project_checklists_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Project Files
ALTER TABLE public.project_files DROP CONSTRAINT IF EXISTS project_files_project_id_fkey;
ALTER TABLE public.project_files ADD CONSTRAINT project_files_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Vendor Orders
ALTER TABLE public.vendor_orders DROP CONSTRAINT IF EXISTS vendor_orders_project_id_fkey;
ALTER TABLE public.vendor_orders ADD CONSTRAINT vendor_orders_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
