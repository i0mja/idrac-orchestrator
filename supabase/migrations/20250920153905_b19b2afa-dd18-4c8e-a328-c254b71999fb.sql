-- Create RPC function for atomic job claiming to prevent race conditions
CREATE OR REPLACE FUNCTION public.claim_jobs(max_jobs integer DEFAULT 5, processor_id uuid DEFAULT gen_random_uuid())
RETURNS TABLE(
  id uuid,
  job_type text,
  server_id uuid,
  host_run_id text,
  status text,
  priority integer,
  progress integer,
  retry_count integer,
  max_retries integer,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  error_message text,
  logs text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atomically claim jobs by updating their status and returning them
  RETURN QUERY
  UPDATE background_jobs
  SET 
    status = 'running',
    started_at = now(),
    updated_at = now(),
    logs = COALESCE(logs, '') || E'\nClaimed by processor: ' || processor_id::text
  WHERE background_jobs.id IN (
    SELECT bj.id
    FROM background_jobs bj
    WHERE bj.status = 'queued'
      AND bj.scheduled_at <= now()
    ORDER BY bj.priority ASC, bj.created_at ASC
    LIMIT max_jobs
    FOR UPDATE SKIP LOCKED  -- This prevents race conditions
  )
  RETURNING 
    background_jobs.id,
    background_jobs.job_type,
    background_jobs.server_id,
    background_jobs.host_run_id,
    background_jobs.status,
    background_jobs.priority,
    background_jobs.progress,
    background_jobs.retry_count,
    background_jobs.max_retries,
    background_jobs.scheduled_at,
    background_jobs.started_at,
    background_jobs.completed_at,
    background_jobs.metadata,
    background_jobs.created_at,
    background_jobs.updated_at,
    background_jobs.error_message,
    background_jobs.logs;
END;
$$;