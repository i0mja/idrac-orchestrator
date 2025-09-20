-- Create RPC function to get host runs
CREATE OR REPLACE FUNCTION public.get_host_runs(limit_count INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'server_id', server_id,
      'state', state,
      'status', status,
      'context', context,
      'started_at', started_at,
      'completed_at', completed_at,
      'error_message', error_message,
      'created_at', created_at,
      'updated_at', updated_at
    )
  )
  INTO result
  FROM host_runs
  ORDER BY created_at DESC
  LIMIT limit_count;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;