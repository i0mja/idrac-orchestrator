import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
  last_login: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useRealUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: {
    username: string;
    email: string;
    role: string;
    full_name?: string;
  }) => {
    try {
      // This would typically involve creating an auth user first
      // For now, just show that the functionality is implemented
      toast({
        title: "Feature Not Available",
        description: "User creation requires admin configuration",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    deleteUser,
  };
}