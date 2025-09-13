-- Create maintenance_windows table for scheduled maintenance events
CREATE TABLE public.maintenance_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  datacenter_id UUID REFERENCES public.datacenters(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_concurrent_updates INTEGER DEFAULT 3,
  recurrence TEXT DEFAULT 'none', -- 'none', 'weekly', 'monthly', 'quarterly'
  next_occurrence DATE,
  notification_hours_before INTEGER DEFAULT 24,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow authenticated access to maintenance windows" 
ON public.maintenance_windows 
FOR ALL 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_maintenance_windows_updated_at
BEFORE UPDATE ON public.maintenance_windows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient queries
CREATE INDEX idx_maintenance_windows_datacenter_date ON public.maintenance_windows(datacenter_id, scheduled_date);
CREATE INDEX idx_maintenance_windows_status_date ON public.maintenance_windows(status, scheduled_date);