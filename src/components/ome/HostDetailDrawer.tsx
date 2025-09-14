import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import type { Host } from '@/pages/ome/types';
import { discoverHost, omeResolveDevice } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useOme } from '@/pages/ome/hooks/useOme';

interface Props {
  host: Host | null;
  onClose: () => void;
}

export function HostDetailDrawer({ host, onClose }: Props) {
  const { toast } = useToast();
  const { connection } = useOme();
  const [omeId, setOmeId] = useState<number | null>(null);

  if (!host) return null;

  const handleDiscover = async () => {
    try {
      await discoverHost(host.id);
      toast({ description: 'Discovery triggered' });
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    }
  };

  const handleResolve = async () => {
    if (!connection) {
      toast({ variant: 'destructive', description: 'Select an OME connection' });
      return;
    }
    try {
      const res = await omeResolveDevice(connection.id, host.id);
      if (res.found) {
        setOmeId(res.omeDeviceId!);
        toast({ description: 'Device resolved' });
      } else {
        toast({ description: 'Device not found in OME' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    }
  };

  return (
    <Drawer open={!!host} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{host.fqdn}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-1 text-sm">
          <div>IP: {host.mgmtIp}</div>
          <div>Model: {host.model}</div>
          <div>Service Tag: {host.serviceTag}</div>
          <div>Cluster: {host.clusterMoid}</div>
          <div>Mgmt Kind: {host.mgmtKind}</div>
        </div>
        <DrawerFooter>
          <Button onClick={handleDiscover}>Discover Capabilities</Button>
          <Button onClick={handleResolve}>Resolve in OME</Button>
          {omeId && connection && (
            <Button asChild variant="secondary">
              <a href={`${connection.baseUrl}/#Device/${omeId}`} target="_blank" rel="noreferrer">
                Open in OME
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
