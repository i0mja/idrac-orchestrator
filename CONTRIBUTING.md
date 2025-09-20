# Contributing to iDRAC Updater Orchestrator

Thank you for your interest in contributing to the iDRAC Updater Orchestrator! This guide will help you get started with contributing to our enterprise-grade firmware orchestration platform.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Community and Support](#community-and-support)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Use of sexualized language or imagery
- Personal attacks or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- **Node.js 18+** installed
- **Docker Desktop** for containerized development
- **Git** for version control
- Basic knowledge of **TypeScript**, **React**, and **PostgreSQL**
- Familiarity with **Dell iDRAC** and **VMware vSphere** (for infrastructure-related contributions)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/idrac-updater-orchestrator.git
   cd idrac-updater-orchestrator
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/your-org/idrac-updater-orchestrator.git
   ```

## Development Environment

### Local Development Setup

**Option 1: Full Environment (Recommended for backend changes)**
```bash
# Start complete development environment
./start-supabase-local.sh

# This starts:
# - Supabase local stack (PostgreSQL, Edge Functions, Auth)
# - Frontend development server
# - API development server
```

**Option 2: Frontend Only (For UI/component changes)**
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

**Option 3: API Only (For backend API changes)**
```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start API development server
npm run dev
```

### Development Commands

```bash
# Frontend Development
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run typecheck    # Run TypeScript checks

# Backend API
pnpm api:dev         # Start API development server
pnpm api:build       # Build API for production
pnpm api:test        # Run API tests

# Database Operations
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset local database
npm run db:seed      # Seed test data

# Code Quality
npm run format       # Format code with Prettier
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report
```

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

1. **🐛 Bug Fixes** - Fix existing functionality issues
2. **✨ New Features** - Add new capabilities to the platform
3. **📚 Documentation** - Improve or add documentation
4. **🎨 UI/UX Improvements** - Enhance user interface and experience
5. **⚡ Performance** - Optimize application performance
6. **🔧 Infrastructure** - Improve build, deployment, or development tools
7. **🧪 Testing** - Add or improve test coverage

### Contribution Workflow

1. **Check existing issues** to avoid duplicating work
2. **Create or comment on an issue** to discuss your proposed changes
3. **Fork and create a feature branch** from `main`
4. **Implement your changes** following our coding standards
5. **Add or update tests** for your changes
6. **Update documentation** as needed
7. **Submit a pull request** with a clear description

### Branching Strategy

We use a simplified Git flow:

```bash
# Main branches
main            # Production-ready code
develop         # Development integration branch

# Feature branches (create from main)
feature/add-ome-integration
feature/improve-cluster-scheduling
fix/server-discovery-timeout
docs/api-reference-update
chore/upgrade-dependencies
```

**Branch Naming Conventions:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without functional changes
- `test/` - Test additions or improvements
- `chore/` - Maintenance tasks, dependency updates

## Pull Request Process

### Before Submitting

Ensure your contribution meets these requirements:

1. **✅ Code Quality**
   - Passes all linting checks (`npm run lint`)
   - Passes TypeScript compilation (`npm run typecheck`)
   - Follows our coding standards (see [CODE_STYLE.md](./CODE_STYLE.md))

2. **✅ Testing**
   - Includes appropriate test coverage
   - All existing tests pass (`npm test`)
   - New functionality includes unit tests
   - Integration tests for API changes

3. **✅ Documentation**
   - Updates relevant documentation files
   - Adds JSDoc comments for new functions/components
   - Updates API documentation for new endpoints
   - Includes examples for new features

4. **✅ Functionality**
   - Feature works as described
   - No breaking changes to existing functionality
   - Handles error cases gracefully
   - Follows security best practices

### Pull Request Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] End-to-end tests

## Testing Details
Describe the testing approach and any specific test cases.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Include screenshots for UI changes.

## Additional Notes
Any additional information that would be helpful for reviewers.
```

### Review Process

1. **Automated Checks** - CI/CD pipeline runs automated tests
2. **Code Review** - At least one maintainer reviews the code
3. **Testing** - Changes are tested in development environment
4. **Documentation Review** - Documentation updates are reviewed
5. **Merge** - Once approved, changes are merged to main branch

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

**Bug Report Template:**
```markdown
## Bug Description
Clear and concise description of the bug.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., Ubuntu 22.04, Windows 11]
- Browser: [e.g., Chrome 91, Firefox 89]
- Application Version: [e.g., 1.0.0]
- Node.js Version: [e.g., 18.17.0]

## Screenshots
If applicable, add screenshots to help explain your problem.

## Additional Context
Any other context about the problem here.

## Logs
```
Include relevant log output
```
```

### Feature Requests

When requesting features, please include:

**Feature Request Template:**
```markdown
## Feature Summary
Brief description of the feature.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Detailed description of the proposed feature.

## Alternative Solutions
Alternative approaches you've considered.

## Use Cases
Specific use cases and user stories.

## Additional Context
Screenshots, mockups, or examples that help explain the feature.

## Implementation Considerations
Technical considerations or constraints.
```

## Coding Standards

Please follow our comprehensive coding standards documented in [CODE_STYLE.md](./CODE_STYLE.md).

### Quick Reference

**TypeScript/JavaScript:**
- Use TypeScript for all new code
- Prefer `const` and `let` over `var`
- Use explicit return types for functions
- Follow naming conventions (camelCase, PascalCase, UPPER_CASE)

**React:**
- Use functional components with hooks
- Follow component naming conventions
- Use proper prop types and interfaces
- Implement proper error boundaries

**CSS/Styling:**
- Use Tailwind CSS classes
- Follow design system tokens
- Use component variants over inline styles
- Ensure responsive design

**API Development:**
- Use proper HTTP methods and status codes
- Implement comprehensive error handling
- Document all endpoints with examples
- Follow RESTful design principles

## Testing Requirements

### Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage for new code
- **Integration Tests**: Required for API endpoints
- **Component Tests**: Required for React components
- **E2E Tests**: Required for critical user workflows

### Testing Guidelines

**Unit Tests:**
```typescript
// Example unit test
describe('ServerManagement', () => {
  describe('updateServerFirmware', () => {
    it('should update server firmware successfully', async () => {
      // Arrange
      const serverId = 'test-server-001';
      const firmwareUrl = 'https://example.com/firmware.bin';
      
      // Act
      const result = await updateServerFirmware(serverId, firmwareUrl);
      
      // Assert
      expect(result.success).toBe(true);
    });
  });
});
```

**Integration Tests:**
```typescript
// Example API integration test
describe('Server API', () => {
  it('should create and update server', async () => {
    // Create server
    const server = await request(app)
      .post('/api/hosts')
      .send({ hostname: 'test-server.example.com' })
      .expect(201);
    
    // Update server
    await request(app)
      .put(`/api/hosts/${server.body.data.id}`)
      .send({ hostname: 'updated-server.example.com' })
      .expect(200);
  });
});
```

## Documentation Standards

### Code Documentation

**JSDoc Comments:**
```typescript
/**
 * Updates firmware on a Dell server via iDRAC interface
 * 
 * @param serverId - Unique identifier for the target server
 * @param firmwarePackage - Firmware package containing update details
 * @param options - Configuration options for the update process
 * @returns Promise that resolves to update result with status and logs
 * 
 * @throws {ServerNotFoundError} When the specified server doesn't exist
 * @throws {FirmwareIncompatibleError} When firmware is incompatible
 * 
 * @example
 * ```typescript
 * const result = await updateServerFirmware('server-001', firmwarePackage);
 * if (result.success) {
 *   console.log('Firmware updated successfully');
 * }
 * ```
 */
export async function updateServerFirmware(
  serverId: string,
  firmwarePackage: FirmwarePackage,
  options: UpdateOptions = {}
): Promise<UpdateResult> {
  // Implementation
}
```

### Documentation Files

When adding new features, update relevant documentation:

- **README.md** - For major features or changes
- **API_REFERENCE.md** - For new API endpoints
- **ARCHITECTURE.md** - For architectural changes
- **TROUBLESHOOTING.md** - For known issues and solutions

## Community and Support

### Getting Help

If you need help while contributing:

1. **Check Documentation** - Review existing documentation first
2. **Search Issues** - Look for similar questions or problems
3. **Ask in Discussions** - Use GitHub Discussions for questions
4. **Join Community** - Connect with other contributors

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and community discussions
- **Pull Request Reviews** - Technical discussions about code changes

### Recognition

We believe in recognizing our contributors:

- **Contributors List** - All contributors are listed in our README
- **Release Notes** - Major contributions are highlighted in release notes
- **Special Recognition** - Outstanding contributors may receive special recognition

## Development Tips

### Performance Considerations

- **Bundle Size** - Keep bundle size minimal, use code splitting
- **Database Queries** - Optimize database queries and use proper indexes
- **Memory Usage** - Monitor memory usage in long-running operations
- **Caching** - Implement appropriate caching strategies

### Security Best Practices

- **Input Validation** - Always validate and sanitize user input
- **Authentication** - Properly implement authentication and authorization
- **Secrets Management** - Never commit secrets, use environment variables
- **SQL Injection** - Use parameterized queries to prevent SQL injection

### Debugging Tips

- **Development Tools** - Use React Developer Tools and browser dev tools
- **Logging** - Add appropriate logging for debugging
- **Error Handling** - Implement comprehensive error handling
- **Testing** - Write tests to catch issues early

## Useful Resources

### Documentation Links
- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Security Guide](./SECURITY.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Development Guide](./DEVELOPMENT.md)

### External Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Dell iDRAC Documentation](https://www.dell.com/support/manuals/en-us/idrac9-lifecycle-controller-v3.30.30.30/idrac_3.30.30.30_ug/)

Thank you for contributing to iDRAC Updater Orchestrator! Together, we're building the best enterprise firmware orchestration platform.