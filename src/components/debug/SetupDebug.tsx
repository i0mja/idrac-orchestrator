import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SetupDebug() {
  const { isSetupComplete, setupConfig, loading, clearSetup } = useSetupStatus();

  if (loading) {
    return <div>Loading setup status...</div>;
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Setup Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="font-medium">Setup Status:</label>
          <Badge variant={isSetupComplete ? "default" : "destructive"}>
            {isSetupComplete ? "Complete" : "Not Complete"}
          </Badge>
        </div>
        
        {setupConfig && (
          <div className="space-y-2">
            <label className="font-medium">Setup Configuration:</label>
            <pre className="bg-muted p-2 rounded text-sm">
              {JSON.stringify(setupConfig, null, 2)}
            </pre>
          </div>
        )}
        
        <div>
          <label className="font-medium">LocalStorage:</label>
          <pre className="bg-muted p-2 rounded text-sm">
            {localStorage.getItem('idrac_setup_config') || 'null'}
          </pre>
        </div>
        
        <Button variant="destructive" onClick={clearSetup}>
          Clear Setup (For Testing)
        </Button>
      </CardContent>
    </Card>
  );
}