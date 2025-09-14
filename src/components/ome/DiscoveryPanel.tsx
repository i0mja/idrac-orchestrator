import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useOme } from '@/pages/ome/hooks/useOme';
import { RunStatsCards } from './RunStatsCards';
import { DiscoveryPreviewTable } from './DiscoveryPreviewTable';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DiscoveryPanel() {
  const { connection, preview, run, schedule, cancel } = useOme();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [every, setEvery] = useState(60);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  const disabled = !connection || preview.isPending || run.isPending || schedule.isPending || cancel.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          className="w-64"
          placeholder="contains(DeviceName,'r740')"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Input
          type="number"
          min={5}
          className="w-40"
          value={every}
          onChange={(e) => setEvery(parseInt(e.target.value, 10))}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={disabled}
              onClick={() =>
                preview.mutate(filter, {
                  onSuccess: (d) => {
                    setPreviewData(d);
                  },
                  onError: (e: any) => toast({ variant: 'destructive', description: e.message }),
                })
              }
            >
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Preview queries OME and shows a sample of what would be imported—no DB changes.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="success"
              disabled={disabled}
              onClick={() => setConfirmOpen(true)}
            >
              Import Now
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Import Now upserts servers into your hosts table (de-dupe by Service Tag, then Mgmt IP).
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() =>
                schedule.mutate(
                  { everyMinutes: every, filter },
                  {
                    onSuccess: (d) => toast({ description: `Job ${d.jobId}` }),
                    onError: (e: any) => toast({ variant: 'destructive', description: e.message }),
                  }
                )
              }
            >
              Schedule Sync
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Schedule runs periodic discovery via the server queue. You can cancel at any time.
          </TooltipContent>
        </Tooltip>
        <Button
          variant="destructive"
          disabled={disabled}
          onClick={() =>
            cancel.mutate(undefined, {
              onSuccess: () => toast({ description: 'Cancelled' }),
              onError: (e: any) => toast({ variant: 'destructive', description: e.message }),
            })
          }
        >
          Cancel Schedule
        </Button>
      </div>
      {previewData && (
        <>
          <RunStatsCards stats={{ ...previewData.stats, total: previewData.total, skipped: previewData.total }} />
          <DiscoveryPreviewTable sample={previewData.sample} />
        </>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Now</DialogTitle>
          </DialogHeader>
          <p>This will upsert devices into your hosts table. Continue?</p>
          <DialogFooter>
            <Button
              onClick={() =>
                run.mutate(filter, {
                  onSuccess: (d) => {
                    toast({ description: 'Run started' });
                    setConfirmOpen(false);
                  },
                  onError: (e: any) => toast({ variant: 'destructive', description: e.message }),
                })
              }
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
