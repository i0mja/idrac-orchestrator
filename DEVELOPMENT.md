# Development Guide

## Quick Start Development Setup

### Prerequisites
- Node.js 18+ 
- Docker Desktop (for full local development)
- Git

### Option 1: Full Development Environment (Recommended)
```bash
git clone https://github.com/i0mja/idrac-orchestrator.git
cd idrac-orchestrator

# Start complete local environment
./start-supabase-local.sh  # Linux/macOS
# OR
start-supabase-local.bat   # Windows
```

### Option 2: Frontend-Only Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

## Architecture Overview

### Dual Backend System
- **Supabase Edge Functions**: Cloud-native serverless functions
- **Local Fastify API**: On-premise server integration

### Frontend Stack
- React 18 + TypeScript
- Vite build system
- Tailwind CSS with custom design system
- shadcn/ui components

## Development Workflow

### Component Development
1. Create components in appropriate feature directories
2. Use TypeScript for type safety
3. Follow design system patterns in `src/index.css`
4. Add JSDoc comments for complex logic

### API Integration
- Supabase client: `src/integrations/supabase/client.ts`
- Local API client: `src/lib/api.ts`
- Custom hooks in `src/hooks/` for data fetching

### State Management
- TanStack Query for server state
- React Context/hooks for client state
- Real-time updates via Supabase subscriptions

## Code Style Guidelines

### TypeScript Best Practices
- Use strict mode
- Define interfaces for all data structures
- Prefer type assertions over any types
- Use utility types for complex transformations

### React Patterns
- Functional components with hooks
- Custom hooks for business logic
- Error boundaries for error handling
- Lazy loading for performance

### CSS/Styling
- Use semantic design tokens from `index.css`
- Avoid hardcoded colors/spacing
- Mobile-first responsive design
- Dark/light mode support

## Testing Strategy

### Unit Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Testing
- API endpoint testing
- Database integration tests
- E2E workflow testing

## Debugging

### Frontend Debugging
- React DevTools
- Browser developer tools
- Console logging patterns

### Backend Debugging
- Supabase function logs
- Local API debug mode
- Database query analysis

## Performance Considerations

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization
- Bundle size monitoring
- React.memo for expensive components

### Backend Optimization
- Query optimization
- Connection pooling
- Caching strategies
- Background job processing

## Deployment Pipeline

### Development → Staging → Production
1. Feature branch development
2. Pull request review
3. Automated testing
4. Staging deployment
5. Production release

### Environment Configuration
- Development: `.env.local`
- Staging: Environment variables
- Production: Secure credential management

## Contributing Guidelines

### Git Workflow
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Review Process
- Automated checks must pass
- Peer review required
- Documentation updates
- Performance impact assessment

## Common Development Tasks

### Adding New Features
1. Update database schema (if needed)
2. Create/update API endpoints
3. Build frontend components
4. Add tests and documentation

### Database Changes
1. Create migration in `api/db/migrations/`
2. Update TypeScript types
3. Test migration locally
4. Deploy via CI/CD pipeline

### New Edge Functions
1. Create in `supabase/functions/`
2. Add to `supabase/config.toml`
3. Test locally with Supabase CLI
4. Deploy automatically

This guide provides developers with everything needed to contribute effectively to the iDRAC Updater Orchestrator project.