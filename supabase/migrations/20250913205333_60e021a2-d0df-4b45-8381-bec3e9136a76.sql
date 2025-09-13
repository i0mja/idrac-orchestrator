-- Fix function search path security issues for the functions I just created
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE public.campaign_templates 
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_campaign_duration()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.started_at IS NOT NULL THEN
    NEW.actual_duration = NEW.completed_at - NEW.started_at;
  END IF;
  RETURN NEW;
END;
$$;