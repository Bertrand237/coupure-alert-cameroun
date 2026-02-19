# Coupure Alert Cameroun

## Overview

Coupure Alert is a mobile-first application for Cameroon that allows users to report and track utility outages (water, electricity, internet) AND infrastructure incidents (broken pipes, fallen poles, cables on ground) across the country. Users can submit reports with GPS location and photos, view events on a map, confirm reports from other users, browse history with filters, see statistics, generate PDF reports, and receive restoration reminders. The app supports French and English with a bilingual interface.

The project uses an Expo (React Native) frontend with file-based routing via expo-router. All data operations (auth, CRUD, stats) go directly to Appwrite Cloud via the Appwrite Client SDK - no backend server needed for data. The Express server only serves static files for the landing page. Authentication uses Appwrite Auth with phone-to-email mapping ({phone}@coupurealert.app).

## User Preferences

- Preferred communication style: Simple, everyday language
- User communicates in French
- Design preference: Modern, polished, premium aesthetic

## Recent Changes

- **Feb 19 2026**: Added infrastructure incident reporting system (broken pipes, fallen poles, cables, other)
- **Feb 19 2026**: Added daily tips (35 bilingual tips) on home screen
- **Feb 19 2026**: Added "My neighborhood today" feed showing nearby events within 20km
- **Feb 19 2026**: Added PDF report generation (expo-print + expo-sharing) by region and period
- **Feb 19 2026**: Added local notification reminders for restoration checks (expo-notifications)
- **Feb 19 2026**: Updated history/map/stats screens to support both outages and incidents with category filters
- **Feb 19 2026**: Created 'incidents' collection in Appwrite with 13 attributes and 4 indexes
- **Feb 17 2026**: Migrated to fully client-side Appwrite architecture
- **Feb 17 2026**: Auth system uses Appwrite Auth with phone-to-email mapping ({phone}@coupurealert.app)
- **Feb 2026**: Complete UI redesign with premium dark gradient header, colored outage type system
- **Feb 2026**: Platform-specific map implementation (react-native-maps on native, list fallback on web)

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing. Tab navigation in `app/(tabs)/` with 5 tabs: Home, Report, Map, History, Stats. Modal screens for detail views, settings, admin, incident reporting, incident details, and PDF reports
- **State Management**: React Context - `OutageProvider` (`lib/outage-store.tsx`) for outages, `IncidentProvider` (`lib/incident-store.tsx`) for incidents. Data persisted locally using AsyncStorage
- **Internationalization**: Custom i18n system (`lib/i18n.tsx`) supporting French (`fr`) and English (`en`) with auto-detection
- **Fonts**: Nunito font family loaded via `@expo-google-fonts/nunito`
- **Design System**: Custom color palette in `constants/colors.ts` with navy primary (#1B2838), orange accent (#FF5722), and type-specific colors
- **Key Libraries**: expo-location (GPS), expo-image-picker (photos), react-native-maps v1.18.0 (native map only), react-native-svg (charts), expo-haptics, expo-linear-gradient, expo-image, expo-print (PDF), expo-sharing (share files), expo-notifications (local reminders)

### Appwrite Integration

- **Server SDK**: `node-appwrite` used in Express backend (`server/appwrite.ts`) for database operations
- **Client SDK**: `appwrite` npm package for client-side operations (`lib/appwrite.ts`)
- **Database**: Appwrite Cloud (Frankfurt region) - Database ID: `6994aa87003b4207080f`
- **Collections**:
  - `outages` - Utility outage reports (water/electricity/internet)
  - `incidents` - Infrastructure incident reports (broken_pipe/fallen_pole/cable_on_ground/other)
  - `users` - User profiles
- **Outage Attributes**: type (enum), latitude/longitude (float), quartier/ville/region (string), confirmations (int), photoUri (string), estRetablie (bool), dateRetablissement/createdAt (datetime)
- **Incident Attributes**: incidentType (enum), latitude/longitude (float), quartier/ville/region (string), confirmations (int), photoUri (string), commentaire (string), estResolue (bool), dateResolution/createdAt (datetime), userId (string)
- **Secrets**: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY stored as Replit secrets

### Map Implementation

- **Native (iOS/Android)**: Uses `react-native-maps` v1.18.0 via `components/NativeMapView.native.tsx`
- **Web**: List-based fallback view in `app/(tabs)/map.tsx` (react-native-maps not compatible with web)
- **Category filtering**: Outages, Incidents, or All shown on map/list with distinct icons

### Backend (Express.js)

- **Server**: Express 5 running in `server/index.ts` with CORS configured
- **Purpose**: Serves landing page and static files only - all data goes through Appwrite Client SDK
- **Static Serving**: In production, serves static build of Expo web app

### Build & Development

- **Dev workflow**: Run `expo:dev` for Expo client and `server:dev` for Express backend
- **Production build**: `expo:static:build` creates static web bundle, `server:build` bundles server
- **Metro config**: `unstable_enablePackageExports: false` to fix util module resolution for expo-notifications
- **Patches**: Uses `patch-package`

### Key Components

- `components/OutageCard.tsx` - Outage list card with accent bar, type icon, time ago, confirmations
- `components/TypeButton.tsx` - Outage type selector (water/electricity/internet)
- `components/FilterChip.tsx` - Reusable filter chip for type/region filtering
- `components/StatChart.tsx` - SVG pie chart and bar chart components
- `components/NativeMapView.native.tsx` - Native map with markers (iOS/Android only)
- `components/NativeMapView.tsx` - Web stub (returns null)

### Notifications

- `lib/notifications.ts` - Local notification utilities using expo-notifications
- `scheduleRestorationReminder()` - Schedules a reminder after 4 hours asking if outage is still active
- Notifications are scheduled automatically when a user reports an outage
- Works on iOS/Android (no-op on web)

### PDF Reports

- `app/pdf-report.tsx` - Modal screen for generating PDF reports
- Uses `expo-print` to generate HTML-based PDF documents
- Uses `expo-sharing` to share generated PDF files
- Reports can be filtered by region and time period (24h/7d/30d/all)
- Includes outage and incident tables with summary statistics

### Data Flow

App operates offline-first with automatic Appwrite sync. On load, both OutageProvider and IncidentProvider fetch from AsyncStorage (local) and Appwrite Cloud, merging results. New reports are created both locally and on Appwrite. If Appwrite is unreachable, data stays local. Both stores support confirmation tracking (one per user per day), distance-based filtering (Haversine formula), and marking as restored/resolved.

### Daily Tips

- `assets/data/tips.json` - 35 bilingual tips about outage safety, emergency numbers, generator safety, etc.
- Displayed on home screen rotating daily (based on day of year)

## Project Architecture

```
app/
  _layout.tsx          # Root layout with providers (Auth, Outage, Incident)
  auth.tsx             # Authentication screen
  detail.tsx           # Outage detail modal
  incident-detail.tsx  # Incident detail modal
  report-incident.tsx  # Incident reporting modal
  pdf-report.tsx       # PDF report generation modal
  settings.tsx         # Settings modal
  admin.tsx            # Admin panel modal
  (tabs)/
    _layout.tsx        # Tab layout (NativeTabs + ClassicTabs)
    index.tsx          # Home dashboard (tips, feed, stats)
    report.tsx         # Report outage form
    map.tsx            # Map/list view (outages + incidents)
    history.tsx        # History with filters (outages + incidents)
    stats.tsx          # Statistics with charts + PDF button
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
  incident-store.tsx   # Incident data context + AsyncStorage
  notifications.ts     # Local notification utilities
  auth-store.tsx       # Auth context with Appwrite Auth
  i18n.tsx             # Internationalization (fr/en)
  appwrite.ts          # Appwrite client SDK (outages + incidents)
  query-client.ts      # React Query client
constants/
  colors.ts            # Design system colors
assets/
  data/tips.json       # 35 bilingual daily tips
```
