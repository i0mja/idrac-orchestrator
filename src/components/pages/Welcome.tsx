import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Download, 
  Settings, 
  BookOpen, 
  Zap, 
  Shield, 
  Server, 
  Database, 
  Globe,
  CheckCircle,
  Clock,
  Users,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import QuickSetup from "@/components/setup/QuickSetup";
import OneClickInstaller from "@/components/setup/OneClickInstaller";
import { useToast } from "@/hooks/use-toast";

const Welcome: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [showInstaller, setShowInstaller] = useState(false);
  const { toast } = useToast();

  if (showSetup) {
    return <QuickSetup onComplete={() => setShowSetup(false)} />;
  }

  if (showInstaller) {
    return <OneClickInstaller />;
  }

  const features = [
    {
      icon: Server,
      title: "Enterprise Server Management",
      description: "Manage firmware updates across your entire Dell PowerEdge fleet with intelligent orchestration."
    },
    {
      icon: Shield,
      title: "VMware vCenter Integration", 
      description: "Cluster-aware rolling updates that respect DRS/HA policies and maintain service availability."
    },
    {
      icon: Database,
      title: "Centralized Firmware Library",
      description: "Download, store, and validate firmware packages with automated compatibility checking."
    },
    {
      icon: Clock,
      title: "Maintenance Windows",
      description: "Schedule updates during approved maintenance windows with timezone awareness."
    },
    {
      icon: Users,
      title: "Role-Based Security",
      description: "LDAP integration, audit logging, and granular permissions for enterprise compliance."
    },
    {
      icon: Zap,
      title: "Real-Time Monitoring",
      description: "Live health checks, progress tracking, and instant notifications for all operations."
    }
  ];

  const quickActions = [
    {
      id: "quick-setup",
      title: "Quick Setup (Recommended)",
      description: "Auto-detect your environment and get running in 5 minutes",
      icon: Play,
      time: "5 min",
      difficulty: "Easy",
      color: "bg-green-500",
      action: () => setShowSetup(true)
    },
    {
      id: "one-click-install", 
      title: "One-Click Installation",
      description: "Choose your platform and run a single command",
      icon: Download,
      time: "3 min", 
      difficulty: "Easy",
      color: "bg-blue-500",
      action: () => setShowInstaller(true)
    },
    {
      id: "demo-mode",
      title: "Try Demo Mode",
      description: "Explore the interface with sample data",
      icon: Globe,
      time: "1 min",
      difficulty: "Easy", 
      color: "bg-purple-500",
      action: () => {
        toast({
          title: "Demo Mode Starting...",
          description: "Loading sample environment with demo data"
        });
      }
    },
    {
      id: "advanced-setup",
      title: "Advanced Configuration", 
      description: "Full manual setup with custom options",
      icon: Settings,
      time: "15 min",
      difficulty: "Advanced",
      color: "bg-orange-500",
      action: () => {
        // This would navigate to the full setup wizard
        toast({
          title: "Advanced Setup",
          description: "Opening detailed configuration wizard..."
        });
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-4">
            <Badge variant="outline" className="px-3 py-1">
              Enterprise Firmware Management
            </Badge>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              iDRAC Updater Orchestrator
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Intelligent firmware orchestration for Dell servers with VMware vCenter integration. 
              Zero-downtime rolling updates that respect cluster policies.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              onClick={() => setShowSetup(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              Quick Start Setup
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setShowInstaller(true)}
            >
              <Download className="mr-2 h-5 w-5" />
              Installation Options
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <a href="#features" className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Learn More
              </a>
            </Button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {quickActions.map((action) => (
            <Card 
              key={action.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
              onClick={action.action}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${action.color} bg-opacity-10`}>
                    <action.icon className={`h-6 w-6 text-${action.color.split('-')[1]}-600`} />
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {action.time}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={action.difficulty === "Easy" ? "default" : "destructive"}>
                    {action.difficulty}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Section */}
        <div id="features" className="space-y-8 mb-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Enterprise Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for mission-critical environments with the reliability and security your business demands.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Installation Tabs */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Choose Your Installation Method</CardTitle>
            <CardDescription className="text-center">
              Multiple deployment options to fit your environment and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="docker" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="docker">Docker</TabsTrigger>
                <TabsTrigger value="linux">Linux</TabsTrigger>
                <TabsTrigger value="windows">Windows</TabsTrigger>
                <TabsTrigger value="cloud">Cloud</TabsTrigger>
              </TabsList>

              <TabsContent value="docker" className="mt-6">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Docker Installation (Recommended)</h3>
                    <p className="text-muted-foreground">Complete setup with one command</p>
                  </div>
                    <div className="bg-black rounded-lg p-4">
                      <code className="text-green-400 font-mono text-sm">
                        curl -fsSL https://raw.githubusercontent.com/i0mja/idrac-orchestrator/main/install.sh | bash
                      </code>
                    </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Automatic PostgreSQL setup</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>SSL certificates included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Production-ready configuration</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="linux" className="mt-6">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Native Linux Installation</h3>
                    <p className="text-muted-foreground">Direct installation on Ubuntu, RHEL, or CentOS</p>
                  </div>
                    <div className="bg-black rounded-lg p-4">
                      <code className="text-green-400 font-mono text-sm">
                        wget -O- https://raw.githubusercontent.com/i0mja/idrac-orchestrator/main/install.sh | sudo bash
                      </code>
                    </div>
                  <div className="text-sm text-muted-foreground">
                    Installs as systemd service with automatic startup
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="windows" className="mt-6">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Windows Server Installation</h3>
                    <p className="text-muted-foreground">MSI installer for Windows environments</p>
                  </div>
                  <div className="text-center">
                    <Button asChild>
                      <a href="#" className="inline-flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        Download Windows Installer
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    Includes PowerShell setup script and Windows Service configuration
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cloud" className="mt-6">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Cloud Deployment</h3>
                    <p className="text-muted-foreground">One-click deployment to major cloud providers</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Button variant="outline" className="h-16" asChild>
                      <a href="#" className="flex flex-col items-center">
                        <span className="text-sm font-medium">AWS</span>
                        <span className="text-xs text-muted-foreground">CloudFormation</span>
                      </a>
                    </Button>
                    <Button variant="outline" className="h-16" asChild>
                      <a href="#" className="flex flex-col items-center">
                        <span className="text-sm font-medium">Azure</span>
                        <span className="text-xs text-muted-foreground">ARM Template</span>
                      </a>
                    </Button>
                    <Button variant="outline" className="h-16" asChild>
                      <a href="#" className="flex flex-col items-center">
                        <span className="text-sm font-medium">Google Cloud</span>
                        <span className="text-xs text-muted-foreground">Deployment Manager</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of IT teams who trust iDRAC Updater Orchestrator for their firmware management needs.
              Get up and running in minutes with our simplified setup process.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setShowSetup(true)}
              >
                Start Quick Setup
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;