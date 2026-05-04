-- Insert project_files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project_files', 'project_files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to project_files
CREATE POLICY "Enable upload for authenticated users in project_files" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'project_files');

-- Allow everyone to read from project_files bucket
CREATE POLICY "Enable public read access for project_files" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'project_files');

-- Allow owners to delete their files
CREATE POLICY "Enable delete for owners in project_files" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'project_files' AND auth.uid() = owner);
