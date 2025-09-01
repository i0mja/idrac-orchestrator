import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Download, Play, Database, Server, Wifi, Shield, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickSetupProps {
  onComplete: () => void;
}

interface DeploymentOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  difficulty: "easy" | "medium" | "advanced";
  timeEstimate: string;
  requirements: string[];
  autoDetected?: boolean;
}

const QuickSetup: React.FC<QuickSetupProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDeployment, setSelectedDeployment] = useState<string>("");
  const [installProgress, setInstallProgress] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [detectedServices, setDetectedServices] = useState({
    docker: false,
    postgresql: false,
    network: false,
    ports: { available: true, ports: [3000, 5432] }
  });
  const { toast } = useToast();

  const deploymentOptions: DeploymentOption[] = [
    {
      id: "docker-all-in-one",
      name: "Docker All-in-One",
      description: "Complete setup with Docker Compose. Includes database, app, and reverse proxy.",
      icon: Server,
      difficulty: "easy",
      timeEstimate: "5 minutes",
      requirements: ["Docker", "Docker Compose"],
      autoDetected: detectedServices.docker
    },
    {
      id: "local-postgresql", 
      name: "Local PostgreSQL",
      description: "Use existing PostgreSQL server on this machine.",
      icon: Database,
      difficulty: "easy", 
      timeEstimate: "3 minutes",
      requirements: ["PostgreSQL 15+", "Node.js 18+"],
      autoDetected: detectedServices.postgresql
    },
    {
      id: "quick-demo",
      name: "Quick Demo Mode", 
      description: "Temporary setup with in-memory database. Perfect for testing.",
      icon: Play,
      difficulty: "easy",
      timeEstimate: "1 minute",
      requirements: ["None - runs in browser"],
      autoDetected: true
    },
    {
      id: "production-ready",
      name: "Production Installation",
      description: "Full production setup with security, monitoring, and backup.",
      icon: Shield,
      difficulty: "medium",
      timeEstimate: "15 minutes", 
      requirements: ["Linux server", "SSL certificate", "Domain name"]
    }
  ];

  useEffect(() => {
    // Auto-detect available services
    detectServices();
  }, []);

  const detectServices = async () => {
    try {
      // Check for Docker
      const dockerCheck = await fetch('/api/detect/docker').catch(() => ({ ok: false }));
      
      // Check for PostgreSQL
      const postgresCheck = await fetch('/api/detect/postgresql').catch(() => ({ ok: false }));
      
      // Check network connectivity
      const networkCheck = await fetch('/api/detect/network').catch(() => ({ ok: false }));

      setDetectedServices({
        docker: dockerCheck.ok,
        postgresql: postgresCheck.ok, 
        network: networkCheck.ok,
        ports: { available: true, ports: [3000, 5432] }
      });
    } catch (error) {
      console.log("Service detection failed, using defaults");
    }
  };

  const handleDeploymentSelect = (optionId: string) => {
    setSelectedDeployment(optionId);
    setCurrentStep(1);
  };

  const startInstallation = async () => {
    setInstalling(true);
    setInstallProgress(0);

    const steps = getInstallationSteps(selectedDeployment);
    
    for (let i = 0; i < steps.length; i++) {
      setInstallProgress(((i + 1) / steps.length) * 100);
      
      try {
        await executeStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Show progress
      } catch (error) {
        toast({
          title: "Installation Error",
          description: `Failed at step: ${steps[i].name}`,
          variant: "destructive"
        });
        setInstalling(false);
        return;
      }
    }

    toast({
      title: "Setup Complete!",
      description: "Your iDRAC Orchestrator is ready to use.",
    });
    
    setInstalling(false);
    onComplete();
  };

  const getInstallationSteps = (deploymentId: string) => {
    const commonSteps = [
      { name: "Downloading configuration templates", action: "download" },
      { name: "Setting up database", action: "database" },
      { name: "Installing dependencies", action: "dependencies" },
      { name: "Applying security settings", action: "security" },
      { name: "Creating admin user", action: "admin" },
      { name: "Starting services", action: "start" }
    ];

    switch (deploymentId) {
      case "docker-all-in-one":
        return [
          { name: "Downloading Docker images", action: "docker" },
          ...commonSteps,
          { name: "Starting containers", action: "containers" }
        ];
      case "quick-demo":
        return [
          { name: "Initializing demo mode", action: "demo" },
          { name: "Loading sample data", action: "sample" },
          { name: "Starting application", action: "start" }
        ];
      default:
        return commonSteps;
    }
  };

  const executeStep = async (step: { name: string; action: string }) => {
    // Simulate installation steps - in real implementation, these would call actual setup functions
    switch (step.action) {
      case "docker":
        await simulateDockerSetup();
        break;
      case "database":
        await simulateDatabaseSetup();
        break;
      case "demo":
        await simulateDemoSetup();
        break;
      default:
        await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const simulateDockerSetup = async () => {
    // In real implementation: docker-compose up -d
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const simulateDatabaseSetup = async () => {
    // In real implementation: run migrations, create tables
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const simulateDemoSetup = async () => {
    // In real implementation: start with in-memory database
    await new Promise(resolve => setTimeout(resolve, 800));
  };

  if (currentStep === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Quick Setup</h1>
          <p className="text-muted-foreground">
            Choose your deployment option. We'll handle the complex stuff automatically.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {deploymentOptions.map((option) => (
            <Card 
              key={option.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${option.autoDetected ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => handleDeploymentSelect(option.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <option.icon />
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={
                      option.difficulty === "easy" ? "default" : 
                      option.difficulty === "medium" ? "secondary" : "destructive"
                    }>
                      {option.difficulty}
                    </Badge>
                    {option.autoDetected && (
                      <Badge variant="outline" className="text-green-600 border-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Detected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{option.timeEstimate}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Requirements:</p>
                    <ul className="text-sm text-muted-foreground">
                       {option.requirements.map((req, idx) => (
                         <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                           <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                           {req}
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Green badges indicate we've detected the required services on your system. 
            These options will have the fastest setup time.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (currentStep === 1) {
    const option = deploymentOptions.find(o => o.id === selectedDeployment);
    
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Ready to Install</h1>
          <p className="text-muted-foreground">
            {option?.name} - Estimated time: {option?.timeEstimate}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {option?.icon && <option.icon />}
              Installation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">What we'll install:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  iDRAC Updater Orchestrator application
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  PostgreSQL database with optimized schema
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Security configuration and SSL certificates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Default credential profiles and settings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Administrator user account
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Default Configuration:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Web Interface:</span> http://localhost:3000
                </div>
                <div>
                  <span className="font-medium">Database Port:</span> 5432
                </div>
                <div>
                  <span className="font-medium">Default Admin:</span> admin@localhost
                </div>
                <div>
                  <span className="font-medium">Storage Path:</span> /opt/firmware
                </div>
              </div>
            </div>

            {installing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Installing...</span>
                  <span>{Math.round(installProgress)}%</span>
                </div>
                <Progress value={installProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(0)}
            disabled={installing}
          >
            Back to Options
          </Button>
          <Button 
            onClick={startInstallation}
            disabled={installing}
            size="lg"
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
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The installation will create all necessary files and configurations. 
            You can customize settings after the initial setup is complete.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
};

export default QuickSetup;