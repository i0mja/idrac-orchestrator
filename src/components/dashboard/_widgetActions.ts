import { useNavigate, createSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export type NavParams = Record<string, string | number | boolean | string[]>;
export type Action =
  | { type: 'navigate'; path: string; params?: NavParams }
  | { type: 'modal'; id: 'schedule'|'discover'|'maintenance' }
  | { type: 'mutation'; run: () => Promise<any>; success: string; error: string };

export function useDashboardActions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const doAction = async (a?: Action) => {
    if (!a) return;
    if (a.type === 'navigate') {
      const search = a.params
        ? `?${createSearchParams(
            Object.entries(a.params).reduce((acc, [k,v]) => {
              if (Array.isArray(v)) {
                v.forEach(x => acc.append(k, String(x)));
              } else {
                acc.append(k, String(v));
              }
              return acc;
            }, new URLSearchParams())
          )}`
        : '';
      navigate(`${a.path}${search}`);
    } else if (a.type === 'modal') {
      document.dispatchEvent(new CustomEvent('open-dashboard-modal', { detail: a.id }));
    } else if (a.type === 'mutation') {
      try { await a.run(); toast({ title: 'Success', description: a.success }); }
      catch (e:any) { toast({ title: 'Failed', description: a.error, variant: 'destructive' }); }
    }
  };
  return { doAction };
}
