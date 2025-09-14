import { OmeConnectionManager } from '@/components/ome/OmeConnectionManager';
import { DiscoveryPanel } from '@/components/ome/DiscoveryPanel';

export function DiscoveryTab() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Connect to OpenManage Enterprise and launch discovery jobs to import
        devices into your inventory.
      </p>
      <OmeConnectionManager />
      <DiscoveryPanel />
    </div>
  );
}
