# SME Multi-Channel Customer Feedback Aggregator

A full-stack, multi-tenant platform that helps small and medium-sized businesses collect, organize, analyze, and act on customer feedback from multiple channels in one workspace.

- Frontend: [Vercel production app](https://sme-feedback-aggregator-frontend-blue.vercel.app)
- Backend: [Railway production API](https://backend-production-ec52.up.railway.app)
- Health check: [Backend health](https://backend-production-ec52.up.railway.app/health)

## Overview

Customer feedback often arrives through disconnected channels: Gmail, WhatsApp, staff-entered notes, and public forms. This makes it difficult for an SME to see the full customer experience, avoid duplicate work, assign ownership, and follow issues through to resolution.

The SME Multi-Channel Customer Feedback Aggregator brings those sources into a unified, tenant-isolated inbox. It combines feedback capture, workflow management, customer profiles, categorization, AI-assisted analysis, dashboards, and reporting in one responsive application.

## Key Features

- Unified feedback inbox with search, filters, List/Grid or Grid/Table views, and persisted manual view preferences
- Feedback details, status workflow, internal notes, activity history, priorities, categories, and staff assignment
- Business Owner editing of allowed feedback fields with protected imported-provider metadata
- Audited soft deletion and transactional bulk status, category, and delete operations
- Selection of visible feedback or all feedback matching the active filters
- Customer profiles and feedback history
- Dedicated customer workspace at /customer for customer-owned feedback and account workflows
- AI-assisted sentiment analysis, summaries, and category suggestions
- Business-owned feedback categories
- Public feedback forms
- Business Owner and Platform Administrator dashboards and PDF/CSV reporting, including filtered individual feedback records in owner Preview and exports
- Business, branch, staff, invitation, and approval workflows
- Responsive light/dark/system UI using a fixed blue/indigo design system
- Professional modal workflows and layouts designed to remain usable down to approximately 300px

## User Roles

| Role                   | Primary responsibilities                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Platform Administrator | Oversees businesses, users, integrations, platform settings, health, and platform-level reports.                    |
| Business Owner         | Manages an active business across all its branches, feedback, staff, customers, integrations, and business reports. |
| Manager                | Coordinates feedback work within assigned branches.                                                                 |
| Staff                  | Works only with the branches assigned to the staff membership. Branch restrictions are enforced by the backend.     |
| Customer               | Uses the dedicated /customer workspace to access their own feedback and account-related functionality.              |

Business Owners remain business-wide only inside their own tenant. Staff access is restricted server-side to assigned branches; the frontend is not treated as an authorization boundary.

## Feedback Sources

The currently supported product sources are:

| Source       | Intake behavior                                                             |
| ------------ | --------------------------------------------------------------------------- |
| Gmail        | Live OAuth integration with manual synchronization of eligible labeled mail |
| WhatsApp     | Live inbound Meta WhatsApp Cloud API webhook                                |
| Manual Entry | Authenticated feedback entry by authorized business users                   |
| Public Form  | Public, business-specific feedback portal                                   |

Only Gmail and WhatsApp are currently implemented as live external integrations.

## Live Integrations

### Gmail

The Gmail integration:

- Uses OAuth; credentials are stored only by the backend and must never be committed
- Provides a manual Sync Now action
- Imports only messages carrying the configured Customer Feedback Gmail label
- Ignores ordinary or general inbox mail
- Preserves provider IDs and deduplication metadata

The current customer-feedback mailbox is marycoopergasanze+feedback@gmail.com. Mail sent to this address is automatically labeled Customer Feedback in Gmail and is then eligible for synchronization.

### WhatsApp

The WhatsApp integration:

- Uses the Meta WhatsApp Cloud API
- Receives inbound feedback automatically through a signed webhook
- Does not poll or simulate inbound delivery
- Preserves provider identifiers for safe deduplication
- Uses the visible Sync Now action only for a read-only activity/status refresh

Webhook processing remains the ingestion path; Sync Now does not fetch or manufacture WhatsApp messages.

## High-Level Architecture

    Gmail OAuth sync ───────────────┐
    WhatsApp Cloud API webhook ────┤
    Manual Entry ──────────────────┤
    Public Form ───────────────────┼─> Source adapters
                                          |
                                          v
                                NormalizedFeedbackInput
                                          |
                                          v
                                FeedbackProcessingService
                                          |
                         ingestion, validation, deduplication
                                          |
                                          v
                               Prisma + MySQL persistence
                                          |
                                          v
                       Express REST API and access policies
                                          |
                                          v
                         React role-specific workspaces

All supported intake paths converge on the shared feedback-processing service. Provider connectors do not bypass the ingestion, validation, tenant, or deduplication pipeline.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form and Zod
- Tailwind CSS
- Recharts

### Backend

- Node.js 20+
- Express
- TypeScript
- Prisma ORM
- MySQL
- Zod validation
- Argon2, JSON Web Tokens, Helmet, and rate limiting
- Pino logging
- PDFKit for generated PDF reports

The repository uses npm workspaces for the frontend and backend packages.

## Project Structure

    .
    ├── backend/
    │   ├── prisma/              # Prisma schema, migrations, and controlled seed
    │   └── src/
    │       ├── config/          # Environment and CORS configuration
    │       ├── middleware/      # Authentication, roles, tenant access, errors
    │       └── modules/         # Domain and integration modules
    ├── frontend/
    │   ├── src/
    │   │   ├── app/             # Providers, router, layouts, and theme
    │   │   ├── components/      # Shared UI and collection controls
    │   │   └── features/        # Role and domain feature areas
    │   └── vercel.json          # SPA routing configuration
    ├── package.json             # Workspace scripts
    └── README.md

Detailed design and operational notes are maintained in [ARCHITECTURE.md](ARCHITECTURE.md), [API_NOTES.md](API_NOTES.md), [DATABASE_NOTES.md](DATABASE_NOTES.md), [SECURITY_NOTES.md](SECURITY_NOTES.md), and [DEPLOYMENT.md](DEPLOYMENT.md).

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MySQL
- Git

### Install Dependencies

From the repository root:

    npm install

### Environment Setup

Create local environment files from the committed examples:

    Copy-Item backend/.env.example backend/.env
    Copy-Item frontend/.env.example frontend/.env

At minimum, configure the backend database connection, authentication secrets, frontend origins, and the frontend API base URL. The main local values are represented by:

- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- FRONTEND_URL
- APP_FRONTEND_URL
- VITE_API_BASE_URL

Optional authentication, SMTP, AI, Gmail OAuth, and WhatsApp Cloud API settings are documented in the example files and [DEPLOYMENT.md](DEPLOYMENT.md). Keep all real credentials, OAuth secrets, access tokens, verify tokens, encryption keys, and database passwords out of source control.

The default local endpoints are:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- API base: http://localhost:5000/api
- API health: http://localhost:5000/api/health
- Database health: http://localhost:5000/api/health/database

## Database and Prisma

Create the MySQL database referenced by DATABASE_URL, then apply the committed migrations. From the backend directory:

    cd backend
    npx prisma migrate deploy --schema=prisma/schema.prisma
    npx prisma generate --schema=prisma/schema.prisma
    cd ..

Useful root-level Prisma commands include:

    npm run prisma:validate
    npm run prisma:generate
    npm run prisma:studio

Database safety rules:

- Never use prisma migrate reset unless deliberately rebuilding a disposable database.
- Never edit a migration that has already been applied.
- Use prisma migrate deploy for committed migrations in shared and production environments.
- Do not casually reseed production or shared databases.
- Production deployment must apply migrations without running the seed.

The checked local Prisma database reports that its schema is up to date.

## Running the Application

Run both workspaces from the repository root:

    npm run dev

Or run them separately:

    npm run dev -w backend
    npm run dev -w frontend

Create production builds locally with:

    npm run build

## Testing

Common static verification commands are:

    npm run typecheck
    npm run lint
    npm run format:check
    npm run build

The repository also provides focused regression suites:

    npm run test:hardening
    npm run test:integrations
    npm run test:automation
    npm run test:admin
    npm run test:phase28

Manual verification remains important, especially for:

- Role, tenant, and branch authorization boundaries
- Gmail OAuth, Customer Feedback label filtering, and duplicate-safe repeat synchronization
- WhatsApp webhook verification, signature validation, and duplicate delivery handling
- Public Form submissions
- Feedback edit, bulk, assignment, and soft-delete workflows
- Customer workspace ownership boundaries
- PDF/CSV downloads
- Responsive light/dark/system behavior at desktop, tablet, and narrow mobile widths

See [NEXT_STEPS.md](NEXT_STEPS.md) for the current manual verification checklist.

## Security and Multi-Tenancy

- Tenant and branch access are enforced in backend policies and service queries.
- Platform Administrator endpoints require the platform administrator role.
- Business Owners are restricted to their own business, while Staff are restricted to assigned branches.
- Customers can access only their own customer workspace data.
- Non-active businesses are blocked from normal tenant operations.
- Provider credentials are encrypted and retained on the backend.
- Imported provider identifiers and source metadata are protected from ordinary feedback edits.
- Feedback deletions are soft deletes with audit activity; bulk mutations are validated and transactional.
- Public submission paths use validation, rate limiting, idempotency, and safe error responses.
- Authentication and integration secrets must be supplied through local environment files or deployment secret managers.

For the complete security model, see [SECURITY_NOTES.md](SECURITY_NOTES.md).

## Production Deployment

| Component      | Platform | URL                                                      |
| -------------- | -------- | -------------------------------------------------------- |
| Frontend       | Vercel   | https://sme-feedback-aggregator-frontend-blue.vercel.app |
| Backend        | Railway  | https://backend-production-ec52.up.railway.app           |
| Backend health | Railway  | https://backend-production-ec52.up.railway.app/health    |

The frontend is a Vite single-page application hosted on Vercel. The backend is built and hosted on Railway with MySQL and production environment values managed outside the repository.

Railway must run the following pre-deploy migration command from the repository root:

    npx prisma migrate deploy --schema=backend/prisma/schema.prisma

A typical backend deployment then builds and starts the workspace:

    npm run build -w backend
    npm run start -w backend

Do not seed the production database during deployment. Keep the Railway frontend-origin/CORS settings aligned with the Vercel origin, and configure provider callback/webhook URLs against the public HTTPS backend.

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment and provider-specific deployment details.

## Current Status

The current full-stack product scope is implemented and deployed. The active product supports Gmail, WhatsApp, Manual Entry, and Public Form feedback, with Gmail and WhatsApp as the only live external integrations. Historical QR and other dormant provider records remain preserved for backward compatibility, audit, and deduplication but are not part of normal product navigation, filters, dashboards, or reports.

Automated and static regression scripts cover the current implementation, while the latest hardening work still requires user-led browser, authorization, tenant-isolation, responsive, integration, and regression verification. Historical implementation details and dated changes are intentionally kept outside this landing page in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) and [CHANGELOG.md](CHANGELOG.md).
