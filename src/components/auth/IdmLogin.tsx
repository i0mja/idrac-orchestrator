import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield } from 'lucide-react';

interface IdmLoginProps {
  onSuccess?: () => void;
}

export function IdmLogin({ onSuccess }: IdmLoginProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    domain: ''
  });
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.username || !formData.password) {
        setError('Username and password are required');
        return;
      }

      console.log('Attempting IDM login for:', formData.username);

      // Call the LDAP authentication edge function
      const { data, error: functionError } = await supabase.functions.invoke('ldap-authentication', {
        body: {
          username: formData.username,
          password: formData.password,
          domain: formData.domain
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error('Authentication service error');
      }

      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      console.log('IDM authentication successful:', data.user);

      // Set session using the returned tokens
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to establish session');
        }
      }

      toast({
        title: "Login successful",
        description: `Welcome, ${data.user.full_name || data.user.username}!`,
      });

      onSuccess?.();

    } catch (err) {
      console.error('IDM login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : 'Please check your credentials',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 p-2 bg-gradient-primary rounded-full w-12 h-12 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-bold">Red Hat IDM Login</CardTitle>
        <CardDescription>
          Sign in with your Identity Management credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                username: e.target.value
              }))}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                password: e.target.value
              }))}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain (Optional)</Label>
            <Input
              id="domain"
              type="text"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                domain: e.target.value
              }))}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In with IDM'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}