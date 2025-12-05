# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrewMaster AI is a TypeScript/React PWA for brewery inventory management with Google Gemini AI integration.

## Development Commands

```bash
npm install          # Install dependencies (required first)
npm run dev          # Start Vite dev server on port 3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
npm run typecheck    # Run TypeScript type checking
```

## Code Quality

- **ESLint**: Configured for TypeScript and React with `eslint.config.js`
- **Prettier**: Code formatting with `.prettierrc` (single quotes, trailing commas, 100 char width)
- **TypeScript**: Strict mode enabled via `tsconfig.json`

Run `npm run lint:fix && npm run format` before committing.

## Environment Setup

Set `GEMINI_API_KEY` in `.env.local` with a valid Google Gemini API key.

## Project Structure

```
index.tsx                    # Entry point - Root component with auth routing
src/
├── components/
│   ├── modals/              # Modal dialogs
│   │   ├── InventoryModal.tsx
│   │   ├── EmployeeModal.tsx
│   │   ├── ManualInputModal.tsx
│   │   ├── RecipeModal.tsx
│   │   └── ScheduleModal.tsx
│   ├── BreweryApp.tsx       # Main app layout with all state management
│   ├── Navigation.tsx       # Sidebar, MobileHeader, PageHeader
│   ├── NotificationBell.tsx
│   └── InventoryActionButtons.tsx
├── pages/
│   ├── AuthPage.tsx         # Login/registration
│   ├── DashboardPage.tsx    # Tasks and activity overview
│   ├── InventoryPage.tsx    # Stock management table
│   ├── ProductionPage.tsx   # Recipes and calendar schedule
│   ├── AIAssistantPage.tsx  # Gemini chat interface
│   ├── IntegrationsPage.tsx # Export/sync placeholders
│   └── EmployeesPage.tsx    # User management (admin only)
├── hooks/
│   └── useStickyState.ts    # localStorage persistence hook
├── types/
│   └── index.ts             # All TypeScript interfaces
├── config/
│   └── aiTools.ts           # Gemini AI function declarations
└── data/
    └── initialData.ts       # Initial inventory, recipes, tasks
```

## Architecture

### State Management

All application state lives in `src/components/BreweryApp.tsx`. State is persisted to localStorage via the `useStickyState` hook with brewery-scoped keys: `{breweryName}_{dataType}`.

### Multi-Tenant Data Model

Each brewery has isolated data in localStorage. Users authenticate with brewery name + username + password.

### Authentication & Roles

4 roles with different permissions: admin, brewer, assistant, tester. Role checks are inline in components.

### AI Integration

Google Gemini 2.5 Flash with function calling in `src/pages/AIAssistantPage.tsx`. Tools defined in `src/config/aiTools.ts`:
- `updateInventory` - Modify inventory quantities
- `getInventory` - Query current stock levels

AI uses Russian language system prompts. Conversation context limited to last 6 messages.

### PWA Features

- Service Worker (`sw.js`) for offline caching
- `manifest.json` for installable app metadata
- Before-install-prompt handling in BreweryApp

### Dependencies

React, React-DOM, Lucide icons, and Tailwind CSS are served via CDN. The `@google/genai` package is bundled.

## Key Business Logic

- **Inventory Reservation**: Quantities reserved when brews are scheduled (calculated in `BreweryApp.tsx`)
- **Low-Stock Alerts**: Triggered when available quantity falls below `minLevel`
- **Audit Logging**: All inventory changes logged with timestamps and user attribution
- **Production Workflow**: Check ingredients → Execute brew → Update inventory → Log action
