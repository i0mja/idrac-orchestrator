import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Download, Terminal, Globe, Smartphone, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstallMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  command?: string;
  steps: string[];
  platform: "windows" | "macos" | "linux" | "docker" | "cloud";
}

const OneClickInstaller: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>("docker");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const installMethods: InstallMethod[] = [
    {
      id: "docker",
      name: "Docker (Recommended)",
      description: "One command to run everything",
      icon: Terminal,
      platform: "docker",
      command: `curl -fsSL https://raw.githubusercontent.com/your-org/idrac-orchestrator/main/install.sh | bash`,
      steps: [
        "Download Docker Compose configuration",
        "Pull required container images", 
        "Generate SSL certificates",
        "Initialize database with schema",
        "Create default admin user",
        "Start all services"
      ]
    },
    {
      id: "linux-native",
      name: "Linux Native Install",
      description: "Direct installation on Linux server",
      icon: Terminal,
      platform: "linux",
      command: `wget -O- https://install.idrac-orchestrator.com/linux.sh | sudo bash`,
      steps: [
        "Install PostgreSQL 15",
        "Create database and user",
        "Install Node.js runtime",
        "Download application files",
        "Configure systemd service",
        "Setup SSL and security"
      ]
    },
    {
      id: "windows",
      name: "Windows Installer",
      description: "MSI package for Windows Server",
      icon: Smartphone,
      platform: "windows", 
      steps: [
        "Download MSI installer",
        "Install PostgreSQL dependency",
        "Configure Windows services",
        "Setup firewall rules",
        "Create admin user",
        "Start application service"
      ]
    },
    {
      id: "cloud-deploy",
      name: "Cloud Deployment",
      description: "Deploy to AWS, Azure, or GCP",
      icon: Globe,
      platform: "cloud",
      steps: [
        "Select cloud provider",
        "Configure infrastructure as code", 
        "Deploy database and application",
        "Setup load balancer and DNS",
        "Configure monitoring",
        "Validate deployment"
      ]
    }
  ];

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Copied!",
      description: "Installation command copied to clipboard",
    });
  };

  const startInstallation = async () => {
    setInstalling(true);
    setProgress(0);

    const method = installMethods.find(m => m.id === selectedMethod);
    if (!method) return;

    // Simulate installation progress
    for (let i = 0; i < method.steps.length; i++) {
      setProgress(((i + 1) / method.steps.length) * 100);
      
      // Simulate step execution time
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    toast({
      title: "Installation Complete!",
      description: "Your iDRAC Orchestrator is now running at http://localhost:3000",
    });

    setInstalling(false);
  };

  const selectedMethodData = installMethods.find(m => m.id === selectedMethod);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">One-Click Installation</h1>
        <p className="text-muted-foreground">
          Choose your platform and run a single command to get started
        </p>
      </div>

      <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
        <TabsList className="grid w-full grid-cols-4">
          {installMethods.map((method) => (
            <TabsTrigger key={method.id} value={method.id} className="flex items-center gap-2">
              <method.icon />
              <span className="hidden sm:inline">{method.platform}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {installMethods.map((method) => (
          <TabsContent key={method.id} value={method.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <method.icon />
                  {method.name}
                </CardTitle>
                <CardDescription>{method.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {method.command && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Installation Command:</h4>
                    <div className="relative">
                      <code className="block p-3 bg-muted rounded-md text-sm font-mono pr-12 overflow-x-auto">
                        {method.command}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute right-2 top-2"
                        onClick={() => copyCommand(method.command!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Installation Steps:</h4>
                  <div className="space-y-2">
                    {method.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          installing && progress > (index / method.steps.length) * 100
                            ? 'bg-green-500 text-white'
                            : installing && progress === (index / method.steps.length) * 100
                            ? 'bg-blue-500 text-white animate-pulse'  
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {installing && progress > (index / method.steps.length) * 100 ? (
                            "✓"
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={installing && progress > (index / method.steps.length) * 100 ? 'line-through opacity-60' : ''}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {installing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    onClick={startInstallation}
                    disabled={installing}
                    size="lg"
                    className="flex-1"
                  >
                    {installing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Start Installation
                      </>
                    )}
                  </Button>
                  
                  {method.command && !installing && (
                    <Button variant="outline" size="lg" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Docs
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            <strong>What's Included:</strong> Complete application, database, web interface, 
            SSL certificates, and sample configurations.
          </AlertDescription>
        </Alert>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Requirements:</strong> 4GB RAM, 20GB disk space, 
            Linux/Windows Server, Docker (recommended).
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post-Installation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium">Access Web Interface</h4>
              <p className="text-sm text-muted-foreground">
                Open http://localhost:3000 in your browser
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium">Complete Setup Wizard</h4>
              <p className="text-sm text-muted-foreground">
                Configure VMware, credentials, and datacenters
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium">Start Managing</h4>
              <p className="text-sm text-muted-foreground">
                Discover servers and schedule firmware updates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OneClickInstaller;