-- Create host_runs table for state machine tracking
CREATE TABLE public.host_runs (
  id TEXT NOT NULL PRIMARY KEY,
  server_id UUID,
  state TEXT NOT NULL DEFAULT 'PRECHECKS' CHECK (state IN ('PRECHECKS', 'ENTER_MAINT', 'APPLY', 'POSTCHECKS', 'EXIT_MAINT', 'DONE', 'ERROR')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  context JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.host_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated access to host runs" 
ON public.host_runs 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_host_runs_state ON public.host_runs(state);
CREATE INDEX idx_host_runs_status ON public.host_runs(status);
CREATE INDEX idx_host_runs_server_id ON public.host_runs(server_id);
CREATE INDEX idx_host_runs_started_at ON public.host_runs(started_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_host_runs_updated_at
BEFORE UPDATE ON public.host_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for host run updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.host_runs;

-- Update workflow_templates to include workflow steps
ALTER TABLE public.workflow_templates 
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;