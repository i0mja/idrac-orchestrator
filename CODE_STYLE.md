# Code Style Guide

This document outlines the coding standards and best practices for the iDRAC Updater Orchestrator project.

## General Principles

- **Clarity over cleverness**: Write code that is easy to read and understand
- **Consistency**: Follow established patterns throughout the codebase
- **Single Responsibility**: Each function/component should have one clear purpose
- **DRY (Don't Repeat Yourself)**: Extract common functionality into reusable utilities

## TypeScript Guidelines

### Naming Conventions
```typescript
// Use camelCase for variables and functions
const serverCount = 10;
const calculateClusterHealth = () => {};

// Use PascalCase for components, interfaces, and types
interface ServerConfig {}
type UpdateStatus = 'pending' | 'running' | 'completed';
const ServerDashboard = () => {};

// Use UPPER_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
```

### Function Signatures
```typescript
// Use explicit return types for clarity
function updateServerFirmware(
  serverId: string, 
  firmwareUrl: string,
  options?: UpdateOptions
): Promise<UpdateResult> {
  // Implementation
}

// Use async/await over Promises
async function fetchServerData(id: string): Promise<Server> {
  const response = await apiGet<Server>(`/hosts/${id}`);
  return response.data;
}
```

## React Guidelines

### Component Structure
```typescript
interface ServerDashboardProps {
  servers: Server[];
  loading?: boolean;
  onUpdateServer: (serverId: string) => void;
}

export function ServerDashboard({ servers, loading = false, onUpdateServer }: ServerDashboardProps) {
  // State hooks at the top
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  
  // Custom hooks after state
  const { user } = useAuth();
  
  // Event handlers
  const handleServerSelect = useCallback((serverId: string) => {
    setSelectedServers(prev => 
      prev.includes(serverId) ? prev.filter(id => id !== serverId) : [...prev, serverId]
    );
  }, []);
  
  return <div className="space-y-6">{/* Component JSX */}</div>;
}
```

## CSS/Styling Guidelines

### Tailwind CSS Usage
```typescript
// ✅ Good - uses design system tokens
<div className="bg-background text-foreground border border-border">
  <h1 className="text-primary font-semibold">Server Dashboard</h1>
</div>

// ❌ Bad - uses arbitrary colors
<div className="bg-white text-black border border-gray-200">
  <h1 className="text-blue-600 font-semibold">Server Dashboard</h1>
</div>
```

This style guide ensures consistency and maintainability across the entire codebase.