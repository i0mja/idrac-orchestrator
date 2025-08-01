import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Clock,
  Bell,
  BellOff,
  RefreshCw,
  Play
} from "lucide-react";
import { useSystemEvents } from '@/hooks/useSystemEvents';
import { format } from 'date-fns';

const AlertsEventsPage = () => {
  const {
    events,
    loading,
    criticalEvents,
    warningEvents,
    unacknowledgedCount,
    acknowledgeEvent,
    acknowledgeAllEvents,
    triggerAutoOrchestration
  } = useSystemEvents();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      error: 'destructive',
      warning: 'secondary',
      success: 'default',
      info: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading alerts and events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Events</h1>
          <p className="text-muted-foreground">
            Monitor system events and auto-orchestration activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={triggerAutoOrchestration}
            className="flex items-center space-x-2"
            disabled={loading}
          >
            <Play className="h-4 w-4" />
            <span>Trigger Auto-Orchestration</span>
          </Button>
          {unacknowledgedCount > 0 && (
            <Button 
              onClick={acknowledgeAllEvents}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <BellOff className="h-4 w-4" />
              <span>Acknowledge All ({unacknowledgedCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Need review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 100 events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>
            System events, auto-orchestration activities, and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>No events found</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getSeverityIcon(event.severity)}
                        <div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(event.severity)}
                        {!event.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeEvent(event.id)}
                            className="flex items-center space-x-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Acknowledge</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </span>
                        <span>Type: {event.event_type}</span>
                        {event.acknowledged && (
                          <span className="text-green-500">✓ Acknowledged</span>
                        )}
                      </div>
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <>
                        <Separator />
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Event Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsEventsPage;