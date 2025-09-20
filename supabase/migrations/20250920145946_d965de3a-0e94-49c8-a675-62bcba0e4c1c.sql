-- Create background_jobs table for queue system
CREATE TABLE public.background_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('firmware_update', 'maintenance_mode', 'health_check', 'vcenter_sync')),
  host_run_id TEXT,
  server_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 10,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  logs TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated access to background jobs" 
ON public.background_jobs 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX idx_background_jobs_scheduled_at ON public.background_jobs(scheduled_at);
CREATE INDEX idx_background_jobs_server_id ON public.background_jobs(server_id);
CREATE INDEX idx_background_jobs_job_type ON public.background_jobs(job_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_background_jobs_updated_at
BEFORE UPDATE ON public.background_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for job updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.background_jobs;