import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Clock,
  Bell,
  BellOff,
  RefreshCw,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  Eye,
  Bookmark,
  BookmarkCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Star,
  Users,
  History,
  Tag
} from "lucide-react";
import { useSystemEvents, SystemEvent } from '@/hooks/useSystemEvents';
import { format, subDays, subWeeks, subMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const EnhancedAlertsEventsPage = () => {
  const {
    events,
    loading,
    criticalEvents,
    warningEvents,
    unacknowledgedCount,
    acknowledgeEvent,
    acknowledgeAllEvents,
    fetchEvents
  } = useSystemEvents();

  // State management for all features
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);
  const [bookmarkedEvents, setBookmarkedEvents] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const severity = searchParams.get('severity');
    const source = searchParams.get('source');
    const since = searchParams.get('since');
    const eventId = searchParams.get('eventId');
    if (severity) setSelectedSeverity(severity);
    if (source) setSelectedEventType(source);
    if (since) {
      const date = new Date(since);
      if (!isNaN(date.getTime())) setDateRange({ from: date, to: null });
    }
    if (eventId) {
      const evt = events.find(e => e.id === eventId);
      if (evt) setSelectedEvent(evt);
    }
  }, [searchParams, events]);

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchEvents]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!event.title.toLowerCase().includes(searchLower) &&
            !event.description?.toLowerCase().includes(searchLower) &&
            !event.event_type.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Severity filter
      if (selectedSeverity !== 'all' && event.severity !== selectedSeverity) {
        return false;
      }

      // Event type filter
      if (selectedEventType !== 'all' && event.event_type !== selectedEventType) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'acknowledged' && !event.acknowledged) return false;
      if (selectedStatus === 'unacknowledged' && event.acknowledged) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const eventDate = new Date(event.created_at);
        if (dateRange.from && isBefore(eventDate, startOfDay(dateRange.from))) return false;
        if (dateRange.to && isAfter(eventDate, endOfDay(dateRange.to))) return false;
      }

      return true;
    });

    // Sort events
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'severity':
          const severityOrder = { error: 4, warning: 3, success: 2, info: 1 };
          aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0;
          bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'event_type':
          aValue = a.event_type.toLowerCase();
          bValue = b.event_type.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [events, searchTerm, selectedSeverity, selectedEventType, selectedStatus, dateRange, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Statistics
  const eventStats = useMemo(() => {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last7d = subDays(now, 7);
    const last30d = subDays(now, 30);

    return {
      total: filteredEvents.length,
      last24h: filteredEvents.filter(e => isAfter(new Date(e.created_at), last24h)).length,
      last7d: filteredEvents.filter(e => isAfter(new Date(e.created_at), last7d)).length,
      last30d: filteredEvents.filter(e => isAfter(new Date(e.created_at), last30d)).length,
      byType: Object.entries(filteredEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)).sort(([,a], [,b]) => b - a)
    };
  }, [filteredEvents]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
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

  const exportEvents = (exportFormat: 'csv' | 'json') => {
    const dataToExport = filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      severity: event.severity,
      created_at: event.created_at,
      acknowledged: event.acknowledged,
      acknowledged_at: event.acknowledged_at,
      acknowledged_by: event.acknowledged_by
    }));

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
    } else if (exportFormat === 'csv') {
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    }
  };

  const toggleBookmark = (eventId: string) => {
    setBookmarkedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const setQuickDateRange = (days: number) => {
    const now = new Date();
    const from = subDays(now, days);
    setDateRange({ from, to: now });
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
            Advanced monitoring and event management system
          </p>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalEvents.length}</div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{warningEvents.length}</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24h</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.last24h}</div>
            <p className="text-xs text-muted-foreground">New events</p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Filtered</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEvents.length}</div>
            <p className="text-xs text-muted-foreground">From {events.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="card-enterprise">
        <CardContent className="p-6">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Advanced Filters
                <Badge variant="secondary" className="ml-1">
                  {[selectedSeverity, selectedEventType, selectedStatus].filter(f => f !== 'all').length + 
                   (dateRange.from || dateRange.to ? 1 : 0)}
                </Badge>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  id="auto-refresh"
                />
                <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
              </div>
              
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Events</DialogTitle>
                      <DialogDescription>
                        Export filtered events ({filteredEvents.length} events)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-4 pt-4">
                      <Button onClick={() => exportEvents('csv')} className="flex-1">
                        Export as CSV
                      </Button>
                      <Button onClick={() => exportEvents('json')} variant="outline" className="flex-1">
                        Export as JSON
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {unacknowledgedCount > 0 && (
                  <Button onClick={acknowledgeAllEvents} variant="outline" size="sm">
                    <BellOff className="h-4 w-4 mr-2" />
                    Acknowledge All ({unacknowledgedCount})
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Severity</Label>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Event Type</Label>
                  <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Array.from(new Set(events.map(e => e.event_type))).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => setDateRange({ from: range?.from || null, to: range?.to || null })}
                          numberOfMonths={2}
                        />
                        <div className="p-3 border-t">
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" onClick={() => setQuickDateRange(1)}>
                              Last 24 hours
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setQuickDateRange(7)}>
                              Last 7 days
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setQuickDateRange(30)}>
                              Last 30 days
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDateRange({ from: null, to: null })}>
                              Clear
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="card-enterprise">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Events ({filteredEvents.length})
              </CardTitle>
              <CardDescription>
                Advanced event monitoring with filtering, search, and analytics
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortDirection === 'asc' ? 'Oldest' : 'Latest'} First
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[700px]">
            <div className="space-y-4">
              {paginatedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">
                    {filteredEvents.length === 0 ? 'No events found matching your filters' : 'No events to display'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredEvents.length === 0 ? 'Try adjusting your search criteria' : 'Events will appear here as they occur'}
                  </p>
                </div>
              ) : (
                paginatedEvents.map((event) => (
                  <div key={event.id} className="p-4 rounded-lg bg-gradient-subtle border border-border/50 hover:bg-gradient-subtle/80 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getSeverityIcon(event.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground truncate">{event.title}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleBookmark(event.id)}
                              className="h-6 w-6 p-0 hover:bg-transparent"
                            >
                              {bookmarkedEvents.has(event.id) ? (
                                <BookmarkCheck className="h-4 w-4 text-primary" />
                              ) : (
                                <Bookmark className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {event.event_type}
                            </span>
                            {event.acknowledged && (
                              <span className="text-success flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Acknowledged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getSeverityBadge(event.severity)}
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  {getSeverityIcon(event.severity)}
                                  {event.title}
                                </DialogTitle>
                                <DialogDescription>
                                  Event details and metadata
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="font-medium">Event Type</Label>
                                    <p>{event.event_type}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium">Severity</Label>
                                    <p>{getSeverityBadge(event.severity)}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium">Created At</Label>
                                    <p>{format(new Date(event.created_at), 'PPP pp')}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium">Status</Label>
                                    <p>{event.acknowledged ? 'Acknowledged' : 'Unacknowledged'}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="font-medium">Description</Label>
                                  <p className="text-sm mt-1">{event.description || 'No description available'}</p>
                                </div>
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div>
                                    <Label className="font-medium">Metadata</Label>
                                    <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                                      {JSON.stringify(event.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          {!event.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeEvent(event.id)}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage - 2 + i;
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Event Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Last 24 hours</span>
                <span className="font-medium">{eventStats.last24h} events</span>
              </div>
              <Progress value={(eventStats.last24h / Math.max(eventStats.last7d, 1)) * 100} />
              
              <div className="flex justify-between text-sm">
                <span>Last 7 days</span>
                <span className="font-medium">{eventStats.last7d} events</span>
              </div>
              <Progress value={(eventStats.last7d / Math.max(eventStats.last30d, 1)) * 100} />
              
              <div className="flex justify-between text-sm">
                <span>Last 30 days</span>
                <span className="font-medium">{eventStats.last30d} events</span>
              </div>
              <Progress value={100} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Top Event Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventStats.byType.slice(0, 5).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm truncate">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${(count / eventStats.byType[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedAlertsEventsPage;