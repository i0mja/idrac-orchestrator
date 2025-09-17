import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { createPlan, getPlanStatus, listHosts, startPlan, uploadFirmwareFile } from '@/lib/api';
import type { PlanPayload } from '@/lib/api';
import { Loader2, Server, UploadCloud } from 'lucide-react';

const DEFAULT_CATALOG = 'https://downloads.dell.com/catalog/Catalog.xml.gz';

export type UpdateMode = 'LATEST_FROM_CATALOG' | 'SPECIFIC_URL' | 'MULTIPART_FILE';

interface HostRow {
  id: string;
  fqdn: string;
  mgmtIp: string;
  model?: string | null;
  serviceTag?: string | null;
}

interface HostRunCtx {
  progress?: any;
  results?: any[];
  error?: { message?: string };
  finalInventory?: any;
}

interface HostRun {
  id: string;
  hostId: string;
  state: string;
  ctx: HostRunCtx;
  updatedAt?: string;
}

interface PlanStatus {
  id: string;
  hosts: HostRun[];
}

function parseTargets(raw: string): string[] | undefined {
  const entries = raw
    .split(/\r?\n|,/)
    .map(v => v.trim())
    .filter(Boolean);
  return entries.length ? entries : undefined;
}

export function ManualUpdatePanel() {
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [mode, setMode] = useState<UpdateMode>('SPECIFIC_URL');
  const [catalogUrl, setCatalogUrl] = useState<string>(DEFAULT_CATALOG);
  const [imageUrl, setImageUrl] = useState('');
  const [multipartUrl, setMultipartUrl] = useState('');
  const [multipartFile, setMultipartFile] = useState<File | null>(null);
  const [targetsText, setTargetsText] = useState('');
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        setLoadingHosts(true);
        const data = await listHosts();
        setHosts(data);
      } catch (error) {
        toast({ title: 'Failed to load hosts', description: (error as Error).message, variant: 'destructive' });
      } finally {
        setLoadingHosts(false);
      }
    };
    fetchHosts();
  }, [toast]);

  useEffect(() => {
    if (!activePlanId) return;
    let cancelled = false;
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const status = await getPlanStatus(activePlanId);
        if (!cancelled) {
          setPlanStatus(status as PlanStatus);
          const allDone = (status.hosts || []).every((run: HostRun) => run.state === 'DONE' || run.state === 'ERROR');
          if (!allDone) {
            timer = setTimeout(poll, 5000);
          } else {
            setPolling(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast({ title: 'Failed to poll plan status', description: (error as Error).message, variant: 'destructive' });
          setPolling(false);
        }
      }
    };

    setPolling(true);
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activePlanId, toast]);

  const hostMap = useMemo(() => {
    return hosts.reduce<Record<string, HostRow>>((acc, host) => {
      acc[host.id] = host;
      return acc;
    }, {});
  }, [hosts]);

  const handleHostToggle = (id: string) => {
    setSelectedHosts(prev => (prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!selectedHosts.length) {
      toast({ title: 'Select hosts', description: 'Choose at least one host to update.', variant: 'destructive' });
      return;
    }

    if (mode === 'SPECIFIC_URL' && !imageUrl) {
      toast({ title: 'Image URL required', description: 'Provide a firmware image URL for SimpleUpdate.', variant: 'destructive' });
      return;
    }

    if (mode === 'MULTIPART_FILE' && !multipartFile && !multipartUrl) {
      toast({ title: 'Provide firmware file', description: 'Upload a firmware file or provide a downloadable URL.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const artifacts: PlanPayload['artifacts'] = [];
      if (mode === 'SPECIFIC_URL') {
        artifacts.push({ component: 'Firmware', imageUri: imageUrl });
      } else if (mode === 'MULTIPART_FILE') {
        if (multipartFile) {
          const upload = await uploadFirmwareFile(multipartFile);
          artifacts.push({ component: 'Firmware', imageUri: upload.uri });
        } else if (multipartUrl) {
          artifacts.push({ component: 'Firmware', imageUri: multipartUrl });
        }
      }

      const policy: Record<string, unknown> = {
        updateMode: mode,
        catalogUrl,
        targets: parseTargets(targetsText)
      };

      const payload: PlanPayload = {
        name: `manual-${mode.toLowerCase()}-${Date.now()}`,
        targets: selectedHosts,
        artifacts,
        policy
      };

      const plan = await createPlan(payload);
      await startPlan(plan.id);
      toast({ title: 'Update started', description: 'Plan queued for selected hosts.' });
      setActivePlanId(plan.id);
      setPlanStatus(null);
    } catch (error) {
      toast({ title: 'Failed to start update', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderProgress = (run: HostRun) => {
    const host = hostMap[run.hostId];
    const progress = run.ctx?.progress;
    const phase = progress?.phase ?? 'N/A';
    const message = progress?.message ?? '';
    return (
      <Card key={run.id} className="bg-muted/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4" />
            {host?.fqdn || host?.mgmtIp || run.hostId}
          </CardTitle>
          <Badge variant={run.state === 'DONE' ? 'success' : run.state === 'ERROR' ? 'destructive' : 'secondary'}>
            {run.state}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Phase: {phase}</Badge>
            {progress?.taskLocation && <Badge variant="outline">Task: {progress.taskLocation}</Badge>}
            {message && <span className="text-muted-foreground">{message}</span>}
          </div>
          {progress?.event?.type && (
            <div className="text-xs text-muted-foreground">
              Last event: {progress.event.type}{progress.event.state ? ` · ${progress.event.state}` : ''}
              {progress.event.status ? ` · ${progress.event.status}` : ''}
            </div>
          )}
          {run.ctx?.results?.length ? (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Results</div>
              <ul className="text-xs space-y-1">
                {run.ctx.results.map((result, idx) => {
                  const label = result.component || result.mode || `Result ${idx + 1}`;
                  const state = result.task?.state || result.racadm?.success === false ? 'ERROR' : result.task?.state || 'DONE';
                  return (
                    <li key={idx} className="flex items-center justify-between">
                      <span>{label}</span>
                      <Badge variant={state === 'Completed' || state === 'DONE' ? 'success' : state === 'ERROR' ? 'destructive' : 'secondary'}>
                        {result.task?.status || result.racadm?.successMessage || state}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {run.ctx?.error?.message && (
            <Alert variant="destructive">
              <AlertDescription>{run.ctx.error.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Firmware Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <Label className="text-sm font-medium">Select Hosts</Label>
            <ScrollArea className="h-48 border rounded-md p-3">
              {loadingHosts ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading hosts...
                </div>
              ) : hosts.length ? (
                <div className="grid gap-2">
                  {hosts.map(host => (
                    <label key={host.id} className="flex items-center gap-3 text-sm">
                      <Checkbox checked={selectedHosts.includes(host.id)} onCheckedChange={() => handleHostToggle(host.id)} />
                      <div>
                        <div className="font-medium">{host.fqdn || host.mgmtIp}</div>
                        <div className="text-xs text-muted-foreground">{host.mgmtIp} {host.model ? `· ${host.model}` : ''}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No hosts registered.</div>
              )}
            </ScrollArea>
          </section>

          <section className="space-y-3">
            <Label className="text-sm font-medium">Update Mode</Label>
            <RadioGroup value={mode} onValueChange={value => setMode(value as UpdateMode)} className="grid gap-2">
              <div className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="LATEST_FROM_CATALOG" id="mode-catalog" />
                <div className="space-y-1">
                  <Label htmlFor="mode-catalog">Latest from Dell Catalog</Label>
                  <p className="text-xs text-muted-foreground">Fetches the latest supported firmware directly from the Dell online catalog.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="SPECIFIC_URL" id="mode-url" />
                <div className="space-y-1">
                  <Label htmlFor="mode-url">Specific package by URL</Label>
                  <p className="text-xs text-muted-foreground">Provide a direct download URL accessible by iDRAC.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="MULTIPART_FILE" id="mode-file" />
                <div className="space-y-1">
                  <Label htmlFor="mode-file">Upload firmware file</Label>
                  <p className="text-xs text-muted-foreground">Push a local firmware package using Redfish multipart upload.</p>
                </div>
              </div>
            </RadioGroup>
          </section>

          {mode === 'LATEST_FROM_CATALOG' && (
            <section className="space-y-2">
              <Label htmlFor="catalog-url">Catalog URL</Label>
              <Input id="catalog-url" value={catalogUrl} onChange={e => setCatalogUrl(e.target.value)} placeholder={DEFAULT_CATALOG} />
            </section>
          )}

          {mode === 'SPECIFIC_URL' && (
            <section className="space-y-2">
              <Label htmlFor="image-url">Firmware Image URL</Label>
              <Input id="image-url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://.../firmware.exe" />
            </section>
          )}

          {mode === 'MULTIPART_FILE' && (
            <section className="grid gap-2">
              <Label>Firmware File</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input type="file" accept=".exe,.bin,.iso,.img,.zip" onChange={e => setMultipartFile(e.target.files?.[0] ?? null)} />
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <UploadCloud className="h-4 w-4" /> Optional: provide a downloadable URL instead of uploading a file.
                </div>
              </div>
              <Input value={multipartUrl} onChange={e => setMultipartUrl(e.target.value)} placeholder="https://.../firmware.exe (optional)" />
            </section>
          )}

          <section className="space-y-2">
            <Label htmlFor="targets">Optional Targets Override</Label>
            <Textarea
              id="targets"
              value={targetsText}
              onChange={e => setTargetsText(e.target.value)}
              placeholder="Enter Redfish component URIs or IDs, separated by commas or new lines"
            />
            <p className="text-xs text-muted-foreground">Example: /redfish/v1/Systems/System.Embedded.1/Bios</p>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Start Update
            </Button>
            {polling && <span className="text-xs text-muted-foreground">Polling plan progress...</span>}
          </div>
        </CardContent>
      </Card>

      {planStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Update Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Plan ID: {planStatus.id}</div>
            <div className="grid gap-3">
              {planStatus.hosts.map(renderProgress)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
