# File Structure

## Repository Overview

This document provides a comprehensive guide to the file organization and purpose of each directory and key file in the iDRAC Updater Orchestrator repository.

## Root Directory Structure

```
idrac-orchestrator/
├── 📁 api/                     # Local Fastify API for on-premise integration
├── 📁 public/                  # Static assets and public files
├── 📁 scripts/                 # Installation and utility scripts
├── 📁 server/                  # Legacy server components
├── 📁 src/                     # React frontend application
├── 📁 supabase/               # Supabase configuration and edge functions
├── 📄 *.md                    # Documentation files
├── 📄 *.sh, *.bat            # Installation scripts
├── 📄 docker-compose*.yml     # Docker configurations
├── 📄 package.json           # Frontend dependencies
├── 📄 tailwind.config.ts     # Tailwind CSS configuration
├── 📄 tsconfig*.json         # TypeScript configurations
└── 📄 vite.config.ts         # Vite build configuration
```

## Core Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project overview and quick start guide |
| `ARCHITECTURE.md` | System architecture and technical design |
| `SYSTEM_OVERVIEW.md` | Business context and solution approach |
| `DATABASE_SCHEMA.md` | Complete database documentation |
| `BUSINESS_LOGIC.md` | Core workflows and business processes |
| `API_REFERENCE.md` | Comprehensive API documentation |
| `QUICK_START.md` | 5-minute installation options |
| `INSTALLATION.md` | Detailed manual setup guide |
| `DEPLOYMENT.md` | Production deployment guide |

## Frontend Application (`src/`)

```
src/
├── 📁 components/              # React components organized by feature
│   ├── 📁 dashboard/          # Dashboard widgets and layouts
│   ├── 📁 inventory/          # Server inventory management
│   ├── 📁 scheduler/          # Update scheduling interfaces
│   ├── 📁 firmware/           # Firmware management UI
│   ├── 📁 vcenter/            # vCenter integration components
│   ├── 📁 settings/           # Application settings
│   ├── 📁 setup/              # Initial setup wizard
│   └── 📁 ui/                 # Base UI components (shadcn/ui)
├── 📁 hooks/                  # Custom React hooks for business logic
├── 📁 pages/                  # Route-level page components
├── 📁 types/                  # TypeScript type definitions
├── 📁 lib/                    # Utility functions and configurations
├── 📁 integrations/           # External service integrations
├── 📄 App.tsx                 # Main application component
├── 📄 main.tsx                # Application entry point
└── 📄 index.css               # Global styles and design tokens
```

## Backend API (`api/`)

```
api/
├── 📁 src/
│   ├── 📁 routes/             # REST API endpoint handlers
│   ├── 📁 lib/                # Integration libraries
│   │   ├── 📁 redfish/        # Dell Redfish API client
│   │   ├── 📁 vcenter/        # VMware vCenter client
│   │   ├── 📁 racadm/         # RACADM command wrapper
│   │   └── 📁 ipmi/           # IPMI integration
│   ├── 📁 orchestration/      # State machine and queue management
│   ├── 📁 workers/            # Background job workers
│   └── 📄 index.ts            # API server entry point
├── 📁 db/                     # Database configuration
│   └── 📁 migrations/         # SQL migration files
├── 📄 package.json            # API dependencies
└── 📄 drizzle.config.ts       # Database ORM configuration
```

## Supabase Integration (`supabase/`)

```
supabase/
├── 📁 functions/              # Edge functions for serverless operations
│   ├── 📄 discover-servers/   # Network server discovery
│   ├── 📄 redfish-update/     # Firmware update orchestration
│   ├── 📄 vcenter-integration/ # vCenter API operations
│   └── 📄 maintenance-scheduler/ # Maintenance window management
└── 📄 config.toml             # Supabase project configuration
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Tailwind CSS configuration with design system |
| `vite.config.ts` | Vite build tool configuration |
| `tsconfig.json` | TypeScript compiler configuration |
| `eslint.config.js` | Code linting rules |
| `docker-compose.prod.yml` | Production Docker setup |
| `.env.example` | Environment variable template |

## Installation Scripts

| Script | Platform | Purpose |
|--------|----------|---------|
| `install.sh` | Linux/macOS | One-click Docker installation |
| `install-rhel.sh` | RHEL 9 | Optimized native installation |
| `scripts/install-windows.ps1` | Windows | PowerShell installation |
| `start-local.sh/.bat` | All | Local development startup |
| `start-supabase-local.sh/.bat` | All | Full-featured local setup |

This structure ensures that any LLM or developer can quickly understand the codebase organization and locate specific functionality.