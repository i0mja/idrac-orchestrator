-- Clean up duplicate datacenters and ensure unique names
DELETE FROM datacenters a USING datacenters b 
WHERE a.id > b.id AND a.name = b.name;

-- Add unique constraint to prevent future duplicates
ALTER TABLE datacenters ADD CONSTRAINT unique_datacenter_name UNIQUE (name);