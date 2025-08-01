-- Add server notes table for documentation
CREATE TABLE public.server_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by TEXT DEFAULT (auth.uid())::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add enhanced server metadata columns
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS cpu_cores INTEGER;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS memory_gb INTEGER;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS storage_gb INTEGER;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS warranty_end_date DATE;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS criticality TEXT DEFAULT 'medium';

-- Enable RLS on server_notes
ALTER TABLE public.server_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for server_notes
CREATE POLICY "Users can view server notes" 
ON public.server_notes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create server notes" 
ON public.server_notes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update server notes" 
ON public.server_notes 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete server notes" 
ON public.server_notes 
FOR DELETE 
USING (true);

-- Create trigger for server_notes updated_at
CREATE TRIGGER update_server_notes_updated_at
BEFORE UPDATE ON public.server_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();