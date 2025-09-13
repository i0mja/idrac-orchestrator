-- Set up pg_cron extension and create scheduled job for maintenance windows
SELECT cron.schedule(
  'maintenance-scheduler',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://hrqzmjjpnylcmunyaovj.supabase.co/functions/v1/maintenance-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycXptampwbnlsY211bnlhb3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NTc2MTEsImV4cCI6MjA2OTUzMzYxMX0.46wLidJyg2b-2xP9G02MKQQ_TuHg2dN66850wGfSXH4"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);