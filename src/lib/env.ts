export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8081';
export const SUPABASE_ENABLED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
