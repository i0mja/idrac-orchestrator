-- Create alerts and events table for logging
CREATE TABLE public.system_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on system_events
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Create policy for system_events
CREATE POLICY "Allow authenticated access to system events" 
ON public.system_events 
FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX idx_system_events_event_type ON public.system_events(event_type);
CREATE INDEX idx_system_events_severity ON public.system_events(severity);
CREATE INDEX idx_system_events_created_at ON public.system_events(created_at);

-- Add auto-orchestration fields to update_orchestration_plans table
ALTER TABLE public.update_orchestration_plans 
ADD COLUMN is_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN next_execution_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN execution_interval_months INTEGER DEFAULT 6,
ADD COLUMN overwritten_plan_id UUID;

-- Create auto-orchestration configuration table
CREATE TABLE public.auto_orchestration_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  execution_interval_months INTEGER DEFAULT 6,
  update_interval_minutes INTEGER DEFAULT 15,
  maintenance_window_start TIME DEFAULT '02:00:00',
  maintenance_window_end TIME DEFAULT '06:00:00',
  cluster_priority_order TEXT[] DEFAULT ARRAY['production', 'staging', 'development'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on auto_orchestration_config
ALTER TABLE public.auto_orchestration_config ENABLE ROW LEVEL SECURITY;

-- Create policy for auto_orchestration_config
CREATE POLICY "Allow authenticated access to auto orchestration config" 
ON public.auto_orchestration_config 
FOR ALL 
USING (true);

-- Insert default configuration
INSERT INTO public.auto_orchestration_config (enabled) VALUES (true);

-- Create trigger for auto_orchestration_config updated_at
CREATE TRIGGER update_auto_orchestration_config_updated_at
BEFORE UPDATE ON public.auto_orchestration_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime publication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_orchestration_config;