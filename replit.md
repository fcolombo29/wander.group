# WanderGroup - Group Travel Management App

## Overview
WanderGroup is a fullstack React+Express PWA for organizing group trips. It allows users to manage shared expenses, plan activities, store documents, view maps, and get AI-powered travel suggestions. The UI is in Spanish. Authentication is handled via Replit Auth (OIDC - supports Google, GitHub, email/password).

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite 6
- **Backend**: Express 5 + TypeScript (tsx)
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Replit Auth (OIDC via openid-client, Passport.js)
- **Styling**: Tailwind CSS (via CDN)
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: Google Gemini API (@google/genai)

## Architecture
- **Frontend** runs on Vite dev server at `0.0.0.0:5000`
- **Backend** runs Express at `localhost:3001`
- Vite proxies `/api/*` requests to the Express server
- `npm run dev` starts both concurrently

## Project Structure
```
/
├── index.html             # Entry HTML (PWA-enabled)
├── index.tsx              # React entry point
├── App.tsx                # Main app with Replit Auth, navigation
├── types.ts               # TypeScript type definitions
├── vite.config.ts         # Vite config (port 5000, proxy to 3001)
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json           # Dependencies and scripts
├── server/
│   ├── index.ts           # Express server entry point
│   ├── db.ts              # Drizzle database connection
│   ├── routes/
│   │   └── api.ts         # All REST API routes (CRUD for trips, expenses, etc.)
│   └── replit_integrations/
│       └── auth.ts        # Replit Auth setup (OIDC, Passport, sessions)
├── shared/
│   └── schema.ts          # Drizzle database schema (11 tables)
├── services/
│   ├── api.ts             # Frontend API client (replaces localStorage)
│   ├── database.ts        # Legacy localStorage service (unused)
│   ├── gemini.ts          # Google Gemini AI integration
│   └── notifications.ts   # Push notification service
├── views/
│   ├── Home.tsx           # Trip listing + join/create
│   ├── TripDashboard.tsx  # Trip overview with expenses chart
│   ├── ExpensesView.tsx   # Shared expenses CRUD + settlement
│   ├── ActivitiesView.tsx # Activity planning + journal
│   ├── DocumentsView.tsx  # Document storage
│   ├── MapsView.tsx       # Map view with pins
│   ├── AIView.tsx         # AI assistant (WanderBot)
│   └── ProfileView.tsx    # User profile
├── sw.js                  # Service worker for PWA
└── manifest.json          # PWA manifest
```

## Database Schema (PostgreSQL)
11 tables: users, sessions, trips, trip_members, expenses, payments, activities, documents, journal_entries, map_pins, invitation_codes

## Key Design Decisions
- **Data Flow**: Frontend uses `services/api.ts` for all data (async fetch), server uses Drizzle ORM
- **Auth**: Replit OIDC auth, no custom login forms. Login button redirects to `/api/login`
- **Invitation Codes**: Generated per trip, shared via code. Users can also join by trip ID
- **Case Convention**: Server uses camelCase (Drizzle), API responses include snake_case aliases for frontend
- **Spanish UI**: All user-facing text is in Spanish

## Configuration
- Dev server runs on port 5000 with all hosts allowed
- Express API on port 3001 (proxied via Vite)
- Gemini API key via GEMINI_API_KEY environment variable
- Database connection via DATABASE_URL environment variable

## Scripts
- `npm run dev` - Start both frontend and backend
- `npm run db:push` - Push Drizzle schema to database
- `npm run build` - Build frontend for production

## Recent Changes
- 2026-02-09: Converted from localStorage-only to fullstack with PostgreSQL
- 2026-02-09: Added Replit Auth (OIDC) replacing custom auth
- 2026-02-09: Created Express REST API with all CRUD routes
- 2026-02-09: Updated all 9 frontend views to use async API service
- 2026-02-09: Added invitation code system for trip sharing
- 2026-03-19: Added configurable push notification settings per user (invitations, expenses, activities) stored in DB with browser Notification API integration
- 2026-03-19: Added trip admin member management — admin can change roles (admin/editor/viewer) and remove members; secured endpoints with admin-only guards
- 2026-03-19: Enhanced documents with: real file upload (base64), inline preview (images/PDF), download to device, per-document visibility control (all/specific members), delete — only the uploader can edit/delete; access filtered server-side
