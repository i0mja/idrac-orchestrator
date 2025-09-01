# Code Style Guide

This document outlines the coding standards and conventions for the iDRAC Updater Orchestrator project.

## TypeScript

### Progressive Strictness
- Use TypeScript with gradual strictness adoption
- Prefer explicit types over `any`
- Use discriminated unions for complex state management
- Handle errors with proper typing (Result types, error boundaries)

```typescript
// ✅ Good: Explicit typing
interface ServerConfig {
  id: string;
  hostname: string;
  status: 'online' | 'offline' | 'maintenance';
}

// ✅ Good: Discriminated unions
type AsyncState<T> = 
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// ❌ Avoid: any types
const config: any = getServerConfig();
```

### Error Handling
- Use typed error handling patterns
- Leverage Zod for runtime validation where appropriate
- Create specific error types for different failure modes

```typescript
// ✅ Good: Typed error handling
const result = await fetchServers().catch((error: Error) => {
  console.error('Failed to fetch servers:', error.message);
  throw new ServerFetchError(error.message);
});
```

## React

### Component Organization
- Use functional components with hooks
- Co-locate small, related components
- Keep components focused and single-responsibility
- Use compound component patterns for complex UI

```typescript
// ✅ Good: Focused component
interface ServerCardProps {
  server: Server;
  onUpdate: (id: string) => void;
}

export function ServerCard({ server, onUpdate }: ServerCardProps) {
  // Component implementation
}
```

### File and Component Naming
- Use PascalCase for component files: `ServerManagement.tsx`
- Use camelCase for utility files: `serverUtils.ts`
- Use kebab-case for CSS/style files: `server-card.css`
- Match component name with file name

### Hooks Patterns
- Custom hooks should start with `use` prefix
- Keep hooks focused on single responsibility
- Use React Query for server state management
- Use useState/useReducer for component-local state

```typescript
// ✅ Good: Focused custom hook
function useServerStatus(serverId: string) {
  return useQuery({
    queryKey: ['server-status', serverId],
    queryFn: () => fetchServerStatus(serverId),
    refetchInterval: 30000,
  });
}
```

### Props and State
- Use Zod schemas for complex prop validation where beneficial
- Prefer composition over prop drilling
- Use context sparingly - avoid context for everything
- Keep component state minimal and derived when possible

## Tailwind CSS

### Class Organization
- Use the `cn()` utility for conditional classes
- Order classes: layout → positioning → sizing → styling → interactive
- Extract repeated class combinations into components or CSS classes

```typescript
// ✅ Good: Organized classes with cn()
<div className={cn(
  "flex items-center justify-between", // layout
  "p-4 rounded-lg", // sizing & styling  
  "bg-card text-card-foreground", // semantic colors
  "hover:bg-accent transition-colors", // interactive
  isSelected && "ring-2 ring-primary"
)} />
```

### Design System Usage
- **CRITICAL**: Always use semantic tokens from design system
- Never use direct colors like `text-white`, `bg-black`
- Use HSL values in design tokens
- Leverage CSS custom properties for theming

```typescript
// ✅ Good: Semantic design tokens
<Button variant="primary" />
<div className="bg-card text-card-foreground" />

// ❌ Bad: Direct colors
<div className="bg-white text-black" />
```

### Dark Mode
- Use CSS custom properties that automatically adapt
- Test components in both light and dark modes
- Ensure proper contrast ratios

## Imports and Module Organization

### Import Patterns
- Use `@/*` alias for internal imports
- Avoid deep relative paths (`../../../`)
- Group imports: external → internal → relative
- Use index.ts files for clean barrel exports

```typescript
// ✅ Good import organization
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useServers } from '@/hooks/useServers';

import './ServerCard.css';
```

### Module Boundaries
- Keep business logic separate from UI components
- Use custom hooks for stateful logic
- Create service layers for API interactions
- Avoid circular dependencies

## State Management

### Preferred Patterns
- React Query for server state (API data)
- useState/useReducer for component-local state
- Context for app-wide settings (theme, user preferences)
- Zustand for complex client state (if needed)

### Data Fetching
- Use React Query for all server state
- Implement proper error boundaries
- Handle loading and error states consistently
- Use optimistic updates where appropriate

```typescript
// ✅ Good: React Query pattern
function useServerUpdates() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    errorBoundary: true,
  });
}
```

## Testing

### Testing Strategy
- Write integration tests for critical user flows
- Unit test complex utility functions
- Use React Testing Library for component tests
- Mock external dependencies appropriately

### Test Organization
- Co-locate test files with source code: `ServerCard.test.tsx`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

## Code Quality

### Formatting
- Use Prettier for consistent formatting
- Run `npm run format` before committing
- Configure editor to format on save

### Linting
- Follow ESLint configuration
- Run `npm run lint:fix` to auto-fix issues
- Address TypeScript errors promptly

### Git Practices
- Use Conventional Commits format
- Keep commits small and focused
- Write descriptive commit messages

```bash
# ✅ Good commit messages
feat(servers): add real-time status updates
fix(auth): handle expired token gracefully
docs(readme): update installation instructions
```

## Performance

### Optimization Guidelines
- Use React.memo for expensive components
- Implement proper key props for lists
- Use useCallback/useMemo judiciously
- Optimize bundle size with code splitting

### Monitoring
- Monitor performance with React DevTools
- Track Core Web Vitals
- Profile slow components and operations

## Security

### Best Practices
- Validate all user inputs with Zod
- Sanitize data before rendering
- Use HTTPS for all API calls
- Implement proper error handling without exposing internals

### Environment Variables
- Never commit secrets to version control
- Use environment-specific configurations
- Validate required environment variables at startup

---

This style guide is a living document. Update it as the project evolves and new patterns emerge.