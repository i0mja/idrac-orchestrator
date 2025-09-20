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
import { useSystemEvents, type UnifiedEvent } from '@/hooks/useSystemEvents';
import { format } from 'date-fns';

const AlertsEventsPage = () => {
  const {
    events,
    loading,
    criticalEvents,
    warningEvents,
    unacknowledgedCount,
    acknowledgeEvent,
    acknowledgeAllEvents
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
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading alerts and events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gradient">Alerts & Events</h1>
          <p className="text-muted-foreground text-lg">
            Monitor system events and auto-orchestration activities
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {unacknowledgedCount > 0 && (
          <Button 
            onClick={acknowledgeAllEvents}
            variant="outline"
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <BellOff className="h-4 w-4" />
            Acknowledge All ({unacknowledgedCount})
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-enterprise">
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

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{warningEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Need review
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
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
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Events
          </CardTitle>
          <CardDescription>
            System events, auto-orchestration activities, and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No events found</p>
                  <p className="text-sm text-muted-foreground mt-1">Events will appear here as they occur</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="p-4 rounded-lg bg-gradient-subtle border border-border/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getSeverityIcon(event.severity)}
        <div>
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            {event.title}
            <Badge variant="outline" className="text-xs">
              {event.event_source}
            </Badge>
          </h4>
          <p className="text-sm text-muted-foreground">{event.description}</p>
          {event.error_details && (
            <p className="text-sm text-destructive mt-1">Error: {event.error_details}</p>
          )}
        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {getSeverityBadge(event.severity)}
                        {!event.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeEvent(event.id)}
                            className="flex items-center justify-center gap-1 w-full sm:w-auto"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Acknowledge</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </span>
                        <span>Type: {event.event_type}</span>
                        <span>Source: {event.event_source}</span>
                        {event.execution_time_ms && (
                          <span>Duration: {event.execution_time_ms}ms</span>
                        )}
                        {event.status && (
                          <span>Status: {event.status}</span>
                        )}
                        {event.acknowledged && (
                          <span className="text-success">✓ Acknowledged</span>
                        )}
                      </div>
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Event Details
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
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