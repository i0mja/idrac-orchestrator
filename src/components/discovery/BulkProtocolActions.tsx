import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  Activity,
  RefreshCw
} from 'lucide-react';

interface BulkActionResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    host: string;
    status: 'success' | 'failed';
    protocols?: any[];
    error?: string;
  }>;
}

export function BulkProtocolActions() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkActionResult | null>(null);
  const { toast } = useToast();

  const runBulkAction = async (action: 'test_all' | 'health_check' | 'update_ready') => {
    setIsRunning(true);
    setCurrentAction(action);
    setProgress(0);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-protocol-actions', {
        body: { action, options: { timeout: 30000 } }
      });

      if (error) throw error;

      setResults(data);
      
      const successRate = data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0;
      
      toast({
        title: "Bulk Action Complete",
        description: `${data.successful}/${data.total} operations successful (${successRate}%)`,
        variant: successRate > 80 ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('Bulk action error:', error);
      toast({
        title: "Bulk Action Failed",
        description: error.message || "Failed to execute bulk action",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentAction('');
      setProgress(100);
    }
  };

  const bulkActions = [
    {
      id: 'test_all',
      label: 'Test All Protocols',
      description: 'Test protocol connectivity for all discovered servers',
      icon: TestTube,
      color: 'bg-blue-500',
      action: () => runBulkAction('test_all')
    },
    {
      id: 'health_check',
      label: 'Health Check All',
      description: 'Perform comprehensive health checks on all servers',
      icon: Activity,
      color: 'bg-green-500',
      action: () => runBulkAction('health_check')
    },
    {
      id: 'update_ready',
      label: 'Check Update Readiness',
      description: 'Verify which servers are ready for firmware updates',
      icon: CheckCircle,
      color: 'bg-purple-500',
      action: () => runBulkAction('update_ready')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bulkActions.map((action) => {
          const Icon = action.icon;
          const isActiveAction = currentAction === action.id;
          
          return (
            <Card 
              key={action.id}
              className={`hover:shadow-md transition-all duration-200 ${
                isActiveAction ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {action.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {action.description}
                </p>
                <Button
                  onClick={action.action}
                  disabled={isRunning}
                  size="sm"
                  className="w-full"
                  variant={isActiveAction ? "default" : "outline"}
                >
                  {isActiveAction ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Display */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Executing Bulk Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Running {currentAction.replace('_', ' ')} across all servers...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Bulk Action Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{results.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">{results.successful}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-error/10">
                <p className="text-2xl font-bold text-error">{results.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error" />
                    )}
                    <span className="font-medium">{result.host}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result.protocols && (
                      <Badge variant="secondary">
                        {result.protocols.filter(p => p.supported).length} protocols
                      </Badge>
                    )}
                    
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {results.failed > 0 && (
              <Alert>
                <AlertDescription>
                  {results.failed} operations failed. Check individual results for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}