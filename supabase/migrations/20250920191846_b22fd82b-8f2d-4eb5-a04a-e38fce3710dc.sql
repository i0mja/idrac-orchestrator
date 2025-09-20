-- Create OME connections table
CREATE TABLE public.ome_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 443,
  use_ssl BOOLEAN NOT NULL DEFAULT true,
  credential_profile_id UUID REFERENCES public.credential_profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'testing')),
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_check_error TEXT,
  connection_metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.ome_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view OME connections" 
ON public.ome_connections 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create OME connections" 
ON public.ome_connections 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update OME connections" 
ON public.ome_connections 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete OME connections" 
ON public.ome_connections 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- Add indexes
CREATE INDEX idx_ome_connections_status ON public.ome_connections(status);
CREATE INDEX idx_ome_connections_active ON public.ome_connections(is_active);
CREATE INDEX idx_ome_connections_credential_profile ON public.ome_connections(credential_profile_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ome_connections_updated_at
BEFORE UPDATE ON public.ome_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();