# Coupure Alert Cameroun

## Overview

Coupure Alert is a mobile-first application for Cameroon that allows users to report and track utility outages (water, electricity, internet) across the country. Users can submit outage reports with GPS location and photos, view outages on a map, confirm reports from other users, browse history with filters, and see statistics. The app supports French and English with a bilingual interface.

The project uses an Expo (React Native) frontend with file-based routing via expo-router. All data operations (auth, CRUD, stats) go directly to Appwrite Cloud via the Appwrite Client SDK - no backend server needed for data. The Express server only serves static files for the landing page. Authentication uses Appwrite Auth with phone-to-email mapping ({phone}@coupurealert.app).

## User Preferences

- Preferred communication style: Simple, everyday language
- User communicates in French
- Design preference: Modern, polished, premium aesthetic

## Recent Changes

- **Feb 17 2026**: Migrated to fully client-side Appwrite architecture - removed Express API dependency for data
- **Feb 17 2026**: Auth system uses Appwrite Auth with phone-to-email mapping ({phone}@coupurealert.app)
- **Feb 17 2026**: Admin panel migrated to Appwrite Client SDK (user mgmt, outage mgmt)
- **Feb 17 2026**: Settings screen simplified - removed manual Appwrite config, shows cloud status
- **Feb 2026**: Complete UI redesign with premium dark gradient header, colored outage type system, animated components
- **Feb 2026**: Platform-specific map implementation (react-native-maps on native, list fallback on web)
- **Feb 2026**: Generated custom app icon matching brand colors
- **Feb 2026**: Applied user's custom logo (lightning bolt + water drop + wifi icon)

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing. Tab navigation in `app/(tabs)/` with 5 tabs: Home, Report, Map, History, Stats. Modal screens: `app/detail.tsx` (outage details), `app/settings.tsx` (settings/Appwrite config)
- **State Management**: React Context (`OutageProvider` in `lib/outage-store.tsx`) manages all outage data. Data persisted locally using `@react-native-async-storage/async-storage`
- **Internationalization**: Custom i18n system (`lib/i18n.tsx`) supporting French (`fr`) and English (`en`) with auto-detection
- **Fonts**: Nunito font family loaded via `@expo-google-fonts/nunito`
- **Design System**: Custom color palette in `constants/colors.ts` with navy primary (#1B2838), orange accent (#FF5722), and type-specific colors (water=cyan, electricity=amber, internet=red)
- **Key Libraries**: expo-location (GPS), expo-image-picker (photos), react-native-maps v1.18.0 (native map only), react-native-svg (charts), expo-haptics, expo-linear-gradient, expo-image

### Appwrite Integration

- **Server SDK**: `node-appwrite` used in Express backend (`server/appwrite.ts`) for all database operations
- **Client SDK**: `appwrite` npm package available for client-side operations (`lib/appwrite.ts`)
- **Database**: Appwrite Cloud (Frankfurt region) - Database ID: `6994aa87003b4207080f`, Collection: `outages`
- **Collection Attributes**: type (enum), latitude/longitude (float), quartier/ville/region (string), confirmations (int), photoUri (string), estRetablie (bool), dateRetablissement/createdAt (datetime)
- **Setup Script**: `scripts/setup-appwrite.ts` auto-creates database, collection, attributes, and indexes
- **Secrets**: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY stored as Replit secrets

### Map Implementation

- **Native (iOS/Android)**: Uses `react-native-maps` v1.18.0 via `components/NativeMapView.native.tsx`
- **Web**: List-based fallback view in `app/(tabs)/map.tsx` (react-native-maps not compatible with web)
- **Platform resolution**: Metro resolves `.native.tsx` for native platforms, `.tsx` for web

### Backend (Express.js + PostgreSQL)

- **Server**: Express 5 running in `server/index.ts` with CORS configured
- **Database**: PostgreSQL via Drizzle ORM + @neondatabase/serverless. Schema in `shared/schema.ts`, DB connection in `server/db.ts`
- **Routes**: Defined in `server/routes.ts`:
  - `GET /api/outages` - List outages (with optional type, region, hours filters)
  - `GET /api/outages/:id` - Get single outage
  - `POST /api/outages` - Create outage
  - `POST /api/outages/batch` - Batch sync local outages
  - `POST /api/outages/:id/confirm` - Increment confirmations
  - `POST /api/outages/:id/restore` - Mark as restored
  - `GET /api/stats` - Get statistics (total, active, restored, byType, byRegion)
- **Static Serving**: In production, serves static build of Expo web app

### Build & Development

- **Dev workflow**: Run `expo:dev` for Expo client and `server:dev` for Express backend
- **Production build**: `expo:static:build` creates static web bundle, `server:build` bundles server
- **Patches**: Uses `patch-package`

### Key Components

- `components/OutageCard.tsx` - Outage list card with accent bar, type icon, time ago, confirmations
- `components/TypeButton.tsx` - Outage type selector (water/electricity/internet)
- `components/FilterChip.tsx` - Reusable filter chip for type/region filtering
- `components/StatChart.tsx` - SVG pie chart and bar chart components
- `components/NativeMapView.native.tsx` - Native map with markers (iOS/Android only)
- `components/NativeMapView.tsx` - Web stub (returns null)

### Data Flow

App operates offline-first with automatic server sync. On load, the OutageProvider fetches from both AsyncStorage (local) and the server API, merging results. New outages are created both locally and on the server. If server is unreachable, data stays local and can be batch-synced later. The outage store generates UUIDs via expo-crypto, supports confirmation tracking (one per user per outage per day), distance-based filtering (Haversine formula), and marking outages as restored.

## Project Architecture

```
app/
  _layout.tsx          # Root layout with providers
  detail.tsx           # Outage detail modal
  settings.tsx         # Settings/Appwrite config modal
  (tabs)/
    _layout.tsx        # Tab layout (NativeTabs + ClassicTabs)
    index.tsx          # Home dashboard
    report.tsx         # Report outage form
    map.tsx            # Map/list view
    history.tsx        # Outage history with filters
    stats.tsx          # Statistics with charts
components/
  OutageCard.tsx       # Outage list item
  TypeButton.tsx       # Type selector button
  FilterChip.tsx       # Filter chip
  StatChart.tsx        # SVG charts
  NativeMapView.tsx    # Web stub
  NativeMapView.native.tsx  # Native map
  ErrorBoundary.tsx    # Error boundary
lib/
  outage-store.tsx     # Outage data context + AsyncStorage
  i18n.tsx             # Internationalization
  appwrite.ts          # Appwrite client SDK
  query-client.ts      # React Query client
constants/
  colors.ts            # Design system colors
```
