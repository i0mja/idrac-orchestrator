import { OmeConnectionManager } from '@/components/ome/OmeConnectionManager';
import { DiscoveryPanel } from '@/components/ome/DiscoveryPanel';

export function DiscoveryTab() {
  return (
    <div className="space-y-4">
      <OmeConnectionManager />
      <DiscoveryPanel />
    </div>
  );
}
