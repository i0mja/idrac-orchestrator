-- Create storage bucket for firmware files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('firmware-files', 'firmware-files', false);

-- Create storage policies for firmware files
CREATE POLICY "Allow authenticated users to view firmware files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'firmware-files' AND true);

CREATE POLICY "Allow authenticated users to upload firmware files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'firmware-files' AND true);

CREATE POLICY "Allow authenticated users to update firmware files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'firmware-files' AND true);

CREATE POLICY "Allow authenticated users to delete firmware files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'firmware-files' AND true);