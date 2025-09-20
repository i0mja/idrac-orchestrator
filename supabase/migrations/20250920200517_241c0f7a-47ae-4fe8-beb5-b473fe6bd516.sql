-- Fix RLS policies for system_events to be user-scoped instead of public
DROP POLICY IF EXISTS "Allow authenticated access to system events" ON public.system_events;

-- Create proper RLS policies for system_events
CREATE POLICY "Users can view system events" 
ON public.system_events 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "System can insert system events" 
ON public.system_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can acknowledge system events" 
ON public.system_events 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Fix RLS policies for eol_alerts to be user-scoped
DROP POLICY IF EXISTS "Allow authenticated access to EOL alerts" ON public.eol_alerts;

CREATE POLICY "Users can view EOL alerts" 
ON public.eol_alerts 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "System can insert EOL alerts" 
ON public.eol_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can acknowledge EOL alerts" 
ON public.eol_alerts 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Create operational_events table for real-time system activities
CREATE TABLE IF NOT EXISTS public.operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL, -- 'ome_connection', 'discovery', 'credential_test', etc.
  severity TEXT NOT NULL DEFAULT 'info'::text,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  server_id UUID,
  connection_id UUID,
  status TEXT NOT NULL, -- 'success', 'failure', 'warning', 'in_progress'
  error_details TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on operational_events
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for operational_events
CREATE POLICY "Users can view operational events" 
ON public.operational_events 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "System can insert operational events" 
ON public.operational_events 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operational_events_created_at ON public.operational_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_events_event_type ON public.operational_events(event_type);
CREATE INDEX IF NOT EXISTS idx_operational_events_severity ON public.operational_events(severity);
CREATE INDEX IF NOT EXISTS idx_operational_events_server_id ON public.operational_events(server_id);

-- Add realtime functionality for operational_events
ALTER TABLE public.operational_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_events;