import { OmeConnectionManager } from '@/components/ome/OmeConnectionManager';
import { AssetsTable } from '@/components/ome/AssetsTable';

export function AssetsTab() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Browse hardware assets gathered from your OpenManage Enterprise
        instance.
      </p>
      <OmeConnectionManager />
      <AssetsTable />
    </div>
  );
}
