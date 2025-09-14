import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createOmeConnection } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useOme } from '@/pages/ome/hooks/useOme';

export function OmeConnectionManager() {
  const { connection, setConnection } = useOme();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [vaultPath, setVaultPath] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const urlValid = /^https?:\/\//.test(baseUrl);
      const vaultValid = vaultPath.startsWith('env:');
      if (!urlValid || !vaultValid) throw new Error('Invalid input');
      const res = await createOmeConnection({ name, baseUrl, vaultPath });
      setConnection({ id: res.id, name, baseUrl });
      toast({ description: 'Connection saved' });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={connection?.id}
          onValueChange={() => {}}
          disabled={!connection}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="No connection yet" />
          </SelectTrigger>
          <SelectContent>
            {connection && (
              <SelectItem value={connection.id}>{connection.name}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add OME Connection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add OME Connection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  placeholder="https://ome.company.local"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Vault Path</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm">?</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Format: env:USER_ENV,PASS_ENV — server reads credentials from your API environment.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder="env:OME_USER,OME_PASS"
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={loading}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
