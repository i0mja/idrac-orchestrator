# Component Architecture

## Overview

The React component architecture follows a feature-based organization with clear separation of concerns. Components are designed for reusability, maintainability, and performance.

## Component Hierarchy

```
src/components/
├── 📁 ui/                     # Base UI primitives (shadcn/ui)
├── 📁 layout/                 # Layout and navigation components
├── 📁 dashboard/              # Dashboard widgets and views
├── 📁 inventory/              # Server inventory management
├── 📁 scheduler/              # Update scheduling and orchestration
├── 📁 firmware/               # Firmware management interfaces
├── 📁 vcenter/                # vCenter integration components
├── 📁 setup/                  # Initial setup and configuration
├── 📁 settings/               # Application settings
├── 📁 alerts/                 # Alerts and notifications
└── 📁 enhanced/               # Enhanced feature components
```

## Core Layout Components

### `AppLayout.tsx`
Main application shell providing navigation and content area.

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout component
 * Provides navigation sidebar, header, and content area
 * Handles responsive layout and theme switching
 */
export function AppLayout({ children }: AppLayoutProps)
```

**Features:**
- Responsive sidebar navigation
- Theme toggle (light/dark mode)
- User profile and logout
- Breadcrumb navigation
- Real-time notification display

### `Header.tsx`
Application header with branding and user controls.

```typescript
/**
 * Application header component
 * Displays branding, navigation controls, and user menu
 */
export function Header()
```

**Features:**
- Logo and application title
- Mobile menu toggle
- User avatar and dropdown
- Theme switcher
- Search functionality

### `Sidebar.tsx`
Navigation sidebar with feature access.

```typescript
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Navigation sidebar component
 * Provides hierarchical navigation and quick actions
 */
export function Sidebar({ isOpen, onToggle }: SidebarProps)
```

**Features:**
- Collapsible navigation
- Feature-based menu organization
- Active route highlighting
- Quick action buttons
- Permission-based menu items

## Dashboard Components

### `ModernEnterpriseDashboard.tsx`
Main dashboard with comprehensive system overview.

```typescript
/**
 * Enterprise dashboard component
 * Displays system health, recent activities, and key metrics
 */
export function ModernEnterpriseDashboard()
```

**Widget Components:**
- `FleetHealthWidget`: Server health overview
- `ActiveOperationsWidget`: Current update operations
- `MaintenanceWindowsWidget`: Upcoming maintenance
- `RecentEventsWidget`: System activity feed
- `QuickActionsWidget`: Common operations

### `DashboardConfig.tsx`
Dashboard customization and widget management.

```typescript
interface DashboardConfigProps {
  widgets: Widget[];
  onConfigChange: (config: DashboardConfig) => void;
}

/**
 * Dashboard configuration component
 * Allows users to customize dashboard layout and widgets
 */
export function DashboardConfig({ widgets, onConfigChange }: DashboardConfigProps)
```

## Inventory Management

### `UnifiedServerManagement.tsx`
Comprehensive server inventory interface.

```typescript
/**
 * Unified server management component
 * Combines server list, filters, and bulk operations
 */
export function UnifiedServerManagement()
```

**Sub-components:**
- `ServerTable`: Sortable and filterable server list
- `ServerFilters`: Advanced filtering options
- `BulkActions`: Multi-server operations
- `ServerDetails`: Detailed server information

### `GlobalInventoryDashboard.tsx`
High-level inventory overview and analytics.

```typescript
/**
 * Global inventory dashboard
 * Provides fleet-wide statistics and health metrics
 */
export function GlobalInventoryDashboard()
```

**Features:**
- Fleet composition analysis
- Health status distribution
- Firmware version tracking
- Geographic distribution

## Scheduler Components

### `ModernSchedulerHub.tsx`
Central scheduling interface for update operations.

```typescript
/**
 * Modern scheduler hub component
 * Provides comprehensive update scheduling and management
 */
export function ModernSchedulerHub()
```

**Key Features:**
- Update plan creation
- Schedule management
- Progress monitoring
- Historical analysis

### `CommandControlCenter.tsx`
Real-time operation monitoring and control.

```typescript
/**
 * Command control center component
 * Real-time monitoring and control of update operations
 */
export function CommandControlCenter()
```

**Capabilities:**
- Live operation status
- Progress visualization
- Emergency controls
- Alert management

### `MaintenanceSchedulingDialog.tsx`
Maintenance window configuration interface.

```typescript
interface MaintenanceSchedulingProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (schedule: MaintenanceSchedule) => void;
}

/**
 * Maintenance scheduling dialog
 * Configure maintenance windows and policies
 */
export function MaintenanceSchedulingDialog({ 
  open, 
  onClose, 
  onSchedule 
}: MaintenanceSchedulingProps)
```

## Firmware Management

### `FirmwareUpload.tsx`
Firmware package upload and management.

```typescript
/**
 * Firmware upload component
 * Handle firmware package uploads with validation
 */
export function FirmwareUpload()
```

**Features:**
- Drag-and-drop upload
- Package validation
- Progress tracking
- Error handling

### `DellDownload.tsx`
Integration with Dell firmware repository.

```typescript
/**
 * Dell firmware download component
 * Search and download firmware from Dell's repository
 */
export function DellDownload()
```

**Capabilities:**
- Firmware search by model
- Compatibility checking
- Automated downloads
- Version management

## vCenter Integration

### `VCenterConnections.tsx`
vCenter server connection management.

```typescript
/**
 * vCenter connections component
 * Manage vCenter server connections and credentials
 */
export function VCenterConnections()
```

### `VCenterClusters.tsx`
Cluster overview and health monitoring.

```typescript
/**
 * vCenter clusters component
 * Display cluster information and health status
 */
export function VCenterClusters()
```

## Setup Components

### `EnhancedOOBEWizard.tsx`
Out-of-box experience setup wizard.

```typescript
interface OOBEWizardProps {
  onComplete: (config: SetupConfig) => Promise<void>;
}

/**
 * Enhanced OOBE wizard component
 * Guide users through initial system setup
 */
export function EnhancedOOBEWizard({ onComplete }: OOBEWizardProps)
```

**Setup Steps:**
1. Organization configuration
2. Database setup
3. vCenter integration
4. Credential management
5. Network discovery
6. Final validation

## Shared UI Components

### Base Components (shadcn/ui)
All UI components follow the shadcn/ui pattern with custom variants:

```typescript
// Example: Enhanced Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants
        gradient: "bg-gradient-primary text-white hover:opacity-90",
        enterprise: "bg-gradient-enterprise text-white shadow-enterprise"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Custom Composite Components

#### `DataTable.tsx`
Reusable data table with sorting, filtering, and pagination.

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  filters?: FilterConfig[];
  onRowSelect?: (rows: T[]) => void;
}

/**
 * Reusable data table component
 * Provides sorting, filtering, pagination, and row selection
 */
export function DataTable<T>({ 
  data, 
  columns, 
  loading,
  pagination,
  filters,
  onRowSelect 
}: DataTableProps<T>)
```

#### `StatusIndicator.tsx`
Consistent status display across the application.

```typescript
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'maintenance';
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Status indicator component
 * Consistent visual representation of system states
 */
export function StatusIndicator({ 
  status, 
  label, 
  showDot = true, 
  size = 'md' 
}: StatusIndicatorProps)
```

#### `ProgressIndicator.tsx`
Progress visualization for long-running operations.

```typescript
interface ProgressIndicatorProps {
  progress: number; // 0-100
  label?: string;
  subLabel?: string;
  variant?: 'linear' | 'circular' | 'steps';
  showPercentage?: boolean;
}

/**
 * Progress indicator component
 * Visual progress representation for operations
 */
export function ProgressIndicator({
  progress,
  label,
  subLabel,
  variant = 'linear',
  showPercentage = true
}: ProgressIndicatorProps)
```

## Component Patterns

### Error Boundaries
Every major feature area includes error boundaries:

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Error boundary component
 * Catches and handles component errors gracefully
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState>
```

### Loading States
Consistent loading patterns across components:

```typescript
interface LoadingStateProps {
  loading: boolean;
  error?: Error;
  children: React.ReactNode;
  skeleton?: React.ComponentType;
}

/**
 * Loading state wrapper
 * Handles loading and error states consistently
 */
export function LoadingState({ 
  loading, 
  error, 
  children, 
  skeleton: Skeleton 
}: LoadingStateProps)
```

### Real-time Updates
Components that require real-time updates use consistent patterns:

```typescript
/**
 * Custom hook for real-time server status
 * Subscribes to server status changes via Supabase
 */
export function useRealtimeServerStatus(hostIds: string[]) {
  const [servers, setServers] = useState<Server[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel('server-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hosts',
        filter: `id=in.(${hostIds.join(',')})`
      }, (payload) => {
        // Update server status
        updateServerStatus(payload);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostIds]);
  
  return servers;
}
```

## Performance Optimizations

### Code Splitting
Major feature components are lazy-loaded:

```typescript
// Lazy load heavy components
const SchedulerHub = lazy(() => import('./scheduler/ModernSchedulerHub'));
const InventoryDashboard = lazy(() => import('./inventory/GlobalInventoryDashboard'));

// Usage with Suspense
<Suspense fallback={<ComponentSkeleton />}>
  <SchedulerHub />
</Suspense>
```

### Memoization
Expensive components use React.memo:

```typescript
/**
 * Memoized server card component
 * Prevents unnecessary re-renders
 */
export const ServerCard = React.memo(({ server, onUpdate }: ServerCardProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.server.id === nextProps.server.id &&
         prevProps.server.status === nextProps.server.status;
});
```

### Virtual Scrolling
Large lists use virtual scrolling:

```typescript
import { FixedSizeList as List } from 'react-window';

/**
 * Virtualized server list
 * Handles large datasets efficiently
 */
export function VirtualizedServerList({ servers }: { servers: Server[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ServerCard server={servers[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={servers.length}
      itemSize={120}
    >
      {Row}
    </List>
  );
}
```

This component architecture ensures scalability, maintainability, and excellent user experience across the entire application.