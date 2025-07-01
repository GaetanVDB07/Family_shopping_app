# Grocery List App - Replit Documentation

## Overview

This is a modern full-stack grocery list application built with React, Express, and PostgreSQL. The application enables families to collaboratively manage their grocery shopping lists with real-time updates via WebSockets. The app uses a monorepo structure with shared schemas and types between client and server.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript, Vite for bundling
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSockets for live updates
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state
- **Validation**: Zod schemas for type-safe data validation

### Architecture Pattern
The application follows a full-stack monorepo pattern with:
- **Client-Server Separation**: Clear separation between frontend and backend code
- **Shared Schema**: Common data models and validation schemas
- **Real-time Communication**: WebSocket integration for collaborative features
- **Type Safety**: End-to-end TypeScript with shared types

## Key Components

### Frontend Architecture
- **Component Structure**: Atomic design with reusable UI components in `/client/src/components/ui/`
- **Page Components**: Feature-specific components in `/client/src/pages/`
- **Custom Hooks**: Reusable logic in `/client/src/hooks/`
- **State Management**: TanStack Query for server state, local state for UI
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Express Server**: RESTful API with middleware for logging and error handling
- **Storage Layer**: Abstracted storage interface with memory-based implementation
- **WebSocket Integration**: Real-time updates for collaborative features
- **Validation**: Zod schemas for request/response validation

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: PostgreSQL schema defined in `/shared/schema.ts`
- **Migrations**: Database migrations managed via Drizzle Kit
- **Connection**: Neon serverless PostgreSQL for cloud deployment

## Data Flow

### Request Flow
1. Client makes API requests through TanStack Query
2. Express server validates requests using Zod schemas
3. Storage layer processes data operations
4. WebSocket broadcasts updates to all connected clients
5. Clients receive real-time updates and update local state

### Real-time Updates
1. User performs action (add/update/delete item)
2. Server processes request and updates storage
3. WebSocket broadcasts change to all connected clients
4. Clients update their local state via query invalidation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives
- **wouter**: Lightweight React router
- **ws**: WebSocket implementation
- **zod**: Schema validation library

### Development Tools
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `/dist/public`
2. **Backend Build**: ESBuild bundles server code to `/dist`
3. **Database**: Drizzle pushes schema changes to PostgreSQL
4. **Static Assets**: Express serves built frontend assets

### Environment Configuration
- **Development**: Uses Vite dev server with HMR and proxy
- **Production**: Express serves static files and API routes
- **Database**: Configured via `DATABASE_URL` environment variable

### Hosting Considerations
- **Frontend**: Static files served by Express in production
- **Backend**: Node.js server with WebSocket support
- **Database**: Neon serverless PostgreSQL (cloud-native)
- **Real-time**: WebSocket connections require persistent server

## Changelog

```
Changelog:
- July 01, 2025. Initial setup - Dutch family grocery list app created
- July 01, 2025. WebSocket stability improved - fixed connection handling and duplicate key warnings
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```