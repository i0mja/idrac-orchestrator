import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  X,
  Tag,
  Building2
} from "lucide-react";

interface CampaignFiltersProps {
  onFiltersChange: (filters: CampaignFilters) => void;
  datacenters: any[];
}

export interface CampaignFilters {
  search: string;
  status: string;
  priority: string;
  datacenter: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  tags: string[];
  createdBy: string;
}

export function CampaignFilters({ onFiltersChange, datacenters }: CampaignFiltersProps) {
  const [filters, setFilters] = useState<CampaignFilters>({
    search: '',
    status: 'all',
    priority: 'all',
    datacenter: 'all',
    dateRange: {},
    tags: [],
    createdBy: 'all'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = (newFilters: Partial<CampaignFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
  };

  const clearFilters = () => {
    const cleared: CampaignFilters = {
      search: '',
      status: 'all',
      priority: 'all',
      datacenter: 'all',
      dateRange: {},
      tags: [],
      createdBy: 'all'
    };
    setFilters(cleared);
    onFiltersChange(cleared);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== '';
    if (key === 'dateRange') return value.from || value.to;
    if (key === 'tags') return (value as string[]).length > 0;
    return value !== 'all';
  }).length;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Primary Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filters.priority} onValueChange={(value) => updateFilters({ priority: value })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Datacenter Filter */}
                <Select value={filters.datacenter} onValueChange={(value) => updateFilters({ datacenter: value })}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select datacenter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Datacenters</SelectItem>
                    {datacenters.map((dc) => (
                      <SelectItem key={dc.id} value={dc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {dc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Range Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd")} -{" "}
                            {format(filters.dateRange.to, "LLL dd")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange.from}
                      selected={filters.dateRange.from && filters.dateRange.to ? {
                        from: filters.dateRange.from,
                        to: filters.dateRange.to
                      } : undefined}
                      onSelect={(range) => updateFilters({ dateRange: range || {} })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Created By Filter */}
                <Select value={filters.createdBy} onValueChange={(value) => updateFilters({ createdBy: value })}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Created by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="me">Created by me</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters Display */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge variant="secondary" className="gap-2">
                      Search: {filters.search}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ search: '' })}
                      />
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="secondary" className="gap-2">
                      Status: {filters.status}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ status: 'all' })}
                      />
                    </Badge>
                  )}
                  {filters.priority !== 'all' && (
                    <Badge variant="secondary" className="gap-2">
                      Priority: {filters.priority}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ priority: 'all' })}
                      />
                    </Badge>
                  )}
                  {filters.datacenter !== 'all' && (
                    <Badge variant="secondary" className="gap-2">
                      Datacenter: {datacenters.find(dc => dc.id === filters.datacenter)?.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ datacenter: 'all' })}
                      />
                    </Badge>
                  )}
                  {(filters.dateRange.from || filters.dateRange.to) && (
                    <Badge variant="secondary" className="gap-2">
                      Date range
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ dateRange: {} })}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}