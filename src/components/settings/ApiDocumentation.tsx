import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Code, Copy, ExternalLink, Lock, Unlock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiEndpoint {
  name: string;
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  example?: {
    request?: any;
    response?: any;
  };
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    name: "Auto Orchestration",
    path: "/functions/v1/auto-orchestration",
    method: "POST",
    description: "Automatically generates and schedules update orchestration plans based on server configurations and maintenance windows.",
    requiresAuth: true,
    example: {
      response: {
        success: true,
        plans_created: 3,
        servers_processed: 45
      }
    }
  },
  {
    name: "Discover Servers",
    path: "/functions/v1/discover-servers",
    method: "POST",
    description: "Performs network discovery to identify Dell servers and their configurations via Redfish API.",
    requiresAuth: true,
    parameters: [
      {
        name: "ip_ranges",
        type: "string[]",
        required: true,
        description: "Array of IP ranges to scan (CIDR notation)"
      },
      {
        name: "credential_profile_id",
        type: "string",
        required: false,
        description: "UUID of credential profile to use for authentication"
      }
    ],
    example: {
      request: {
        ip_ranges: ["10.0.1.0/24", "10.0.2.0/24"],
        credential_profile_id: "123e4567-e89b-12d3-a456-426614174000"
      },
      response: {
        success: true,
        servers_discovered: 12,
        servers_added: 8,
        servers_updated: 4
      }
    }
  },
  {
    name: "Firmware Management",
    path: "/functions/v1/firmware-management",
    method: "POST",
    description: "Handles firmware package uploads, validation, and deployment scheduling for Dell servers.",
    requiresAuth: true,
    parameters: [
      {
        name: "action",
        type: "string",
        required: true,
        description: "Action to perform: 'upload', 'validate', 'schedule', or 'deploy'"
      },
      {
        name: "server_ids",
        type: "string[]",
        required: false,
        description: "Array of server UUIDs to target"
      }
    ]
  },
  {
    name: "Execute Remote Command",
    path: "/functions/v1/execute-remote-command",
    method: "POST",
    description: "Executes remote commands on servers via SSH, WinRM, or iDRAC out-of-band management.",
    requiresAuth: true,
    parameters: [
      {
        name: "server_id",
        type: "string",
        required: true,
        description: "UUID of the target server"
      },
      {
        name: "command",
        type: "string",
        required: true,
        description: "Command to execute"
      },
      {
        name: "method",
        type: "string",
        required: false,
        description: "Execution method: 'ssh', 'winrm', or 'idrac'"
      }
    ]
  },
  {
    name: "Maintenance Orchestrator",
    path: "/functions/v1/maintenance-orchestrator",
    method: "POST",
    description: "Orchestrates maintenance operations across server clusters with VMware integration and safety checks.",
    requiresAuth: true,
    parameters: [
      {
        name: "plan_id",
        type: "string",
        required: true,
        description: "UUID of the orchestration plan to execute"
      },
      {
        name: "dry_run",
        type: "boolean",
        required: false,
        description: "Perform validation without executing changes"
      }
    ]
  },
  {
    name: "VCenter Host Sync",
    path: "/functions/v1/sync-vcenter-hosts",
    method: "POST",
    description: "Synchronizes server inventory with VMware vCenter, updating cluster and VM information.",
    requiresAuth: true,
    parameters: [
      {
        name: "vcenter_id",
        type: "string",
        required: false,
        description: "UUID of specific vCenter to sync (omit to sync all)"
      }
    ]
  },
  {
    name: "Dell Firmware Search",
    path: "/functions/v1/search-dell-firmware",
    method: "GET",
    description: "Searches Dell's firmware catalog for updates compatible with your server models.",
    requiresAuth: true,
    parameters: [
      {
        name: "model",
        type: "string",
        required: false,
        description: "Server model to search for"
      },
      {
        name: "service_tag",
        type: "string",
        required: false,
        description: "Service tag for specific server"
      }
    ]
  },
  {
    name: "Health Check",
    path: "/functions/v1/health-check",
    method: "GET",
    description: "Performs system health checks and returns status of all components and dependencies.",
    requiresAuth: false,
    example: {
      response: {
        status: "healthy",
        components: {
          database: "healthy",
          external_apis: "healthy",
          storage: "healthy"
        },
        timestamp: "2025-01-09T12:00:00Z"
      }
    }
  }
];

export function ApiDocumentation() {
  const { toast } = useToast();
  const baseUrl = "https://hrqzmjjpnylcmunyaovj.supabase.co";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example copied to clipboard"
    });
  };

  const generateCurlExample = (endpoint: ApiEndpoint) => {
    const url = `${baseUrl}${endpoint.path}`;
    const authHeader = endpoint.requiresAuth 
      ? `-H "Authorization: Bearer YOUR_API_KEY" \\\n  ` 
      : '';
    
    if (endpoint.method === 'GET') {
      return `curl -X GET \\\n  ${authHeader}"${url}"`;
    }
    
    const bodyExample = endpoint.example?.request 
      ? JSON.stringify(endpoint.example.request, null, 2)
      : '{}';
      
    return `curl -X ${endpoint.method} \\\n  ${authHeader}-H "Content-Type: application/json" \\\n  -d '${bodyExample}' \\\n  "${url}"`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Complete reference for the iDRAC Updater Orchestrator API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="bg-muted px-2 py-1 rounded text-sm">{baseUrl}</code>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Most endpoints require Bearer token authentication using your API key from the Security Settings.
              </p>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Rate Limiting</h3>
              <p className="text-sm text-muted-foreground">
                API calls are limited to 100 requests per minute per API key. Rate limit headers are included in responses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Available endpoints for server management, firmware updates, and orchestration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {API_ENDPOINTS.map((endpoint) => (
              <Card key={endpoint.name} className="border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-3">
                      {endpoint.name}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {endpoint.method}
                        </Badge>
                        {endpoint.requiresAuth ? (
                          <Lock className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </CardTitle>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Endpoint</h4>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {endpoint.method} {endpoint.path}
                    </code>
                  </div>

                  {endpoint.parameters && (
                    <div>
                      <h4 className="font-semibold mb-2">Parameters</h4>
                      <div className="space-y-2">
                        {endpoint.parameters.map((param) => (
                          <div key={param.name} className="border rounded p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono">{param.name}</code>
                              <Badge variant={param.required ? "default" : "secondary"} className="text-xs">
                                {param.type}
                              </Badge>
                              {param.required && (
                                <Badge variant="destructive" className="text-xs">required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {endpoint.example && (
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        {endpoint.example.request && <TabsTrigger value="request">Request</TabsTrigger>}
                        {endpoint.example.response && <TabsTrigger value="response">Response</TabsTrigger>}
                      </TabsList>
                      
                      <TabsContent value="curl">
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                            <code>{generateCurlExample(endpoint)}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(generateCurlExample(endpoint))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                      
                      {endpoint.example.request && (
                        <TabsContent value="request">
                          <div className="relative">
                            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                              <code>{JSON.stringify(endpoint.example.request, null, 2)}</code>
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(JSON.stringify(endpoint.example.request, null, 2))}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                      
                      {endpoint.example.response && (
                        <TabsContent value="response">
                          <div className="relative">
                            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                              <code>{JSON.stringify(endpoint.example.response, null, 2)}</code>
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(JSON.stringify(endpoint.example.response, null, 2))}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Get your API Key</h4>
              <p className="text-sm text-muted-foreground">
                Find your API key in the Security Settings tab above.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Test connectivity</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Start with the health check endpoint (no authentication required):
              </p>
              <pre className="bg-muted p-3 rounded text-sm">
                <code>curl {baseUrl}/functions/v1/health-check</code>
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Discover servers</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Use the discover-servers endpoint to scan your network:
              </p>
              <pre className="bg-muted p-3 rounded text-sm">
                <code>{generateCurlExample(API_ENDPOINTS[1])}</code>
              </pre>
            </div>

            <div className="pt-4">
              <Button variant="outline" className="w-full" asChild>
                <a href="https://docs.lovable.dev/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Complete Documentation
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}