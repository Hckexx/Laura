# LauraTV — Private Cinematic Streaming Lounge & Cowatch

A private, synchronized movie and TV streaming web application for friends and family with real-time Cowatch, WebRTC voice/video mesh, and ephemeral room chat.

---

## 🎨 Design System & Aesthetics

LauraTV is crafted around a **Private Cinematic Lounge** aesthetic:
- **Palette**: Deep graphite background (`#0d0f12`), dark surfaces (`#13171c`), warm champagne/amber accents (`#e5b869` / `amber-400`), warm near-white text (`#f3f4f6`), and muted subtext (`#9ca3af`).
- **Typography & Motion**: Restrained hover transitions (`scale-[1.03]`), subtle borders (`border-white/[0.08]`), zero neon AI gradients or bouncy card-in-card clutter.
- **Top Navigation**: Horizontal desktop navbar with primary links (**Home**, **Movies**, **TV Shows**, **Watch Together**) + quick search input with `Ctrl+K`/`⌘K` badge. Responsive slide-over drawer on mobile.

---

## ⌨️ Centralized Keyboard Shortcuts

LauraTV includes an input-guarded global keyboard shortcut system (all single-letter shortcuts are safely suppressed while typing in chat, search, or inputs):

| Key | Action | Context |
|---|---|---|
| `Ctrl+K` / `⌘K` | Focus navbar search input without navigating | Global |
| `F` | Toggle LauraTV Fullscreen | Cowatch / Player |
| `C` | Toggle Chat Drawer | Cowatch Room |
| `P` | Toggle People Panel | Cowatch Room |
| `M` | Toggle Microphone On / Mute | Cowatch Room |
| `V` | Toggle Camera On / Off | Cowatch Room |
| `Escape` | Close share modal / drawer / overlay | Global |

---

## 🍿 Private Cowatch Architecture

- **Private Room Privacy**: No public room lists, search, presence, or discovery exist. Sessions are strictly invite-only via 6-character room codes or custom share slugs (e.g. `https://watch.theunfilteredgoose.in/saras-personal-den` or `K7Q2MP`).
- **Custom Slug Collision Safety**: If a requested custom slug is already claimed or invalid, LauraTV returns the neutral error `"That private room link isn't available."` without silently overriding it or leaking metadata.
- **Canonical Public Links**: Configured via `VITE_COWATCH_PUBLIC_URL` with native Web Share API support and clipboard copy fallbacks.
- **Kick Protection**: Cooldown keys canonicalize locators (code or custom slug) to the runtime room code (`canonicalCode:clientIP`) to prevent rejoin bypass.
- **Spatial Layout**:
  - **Dominant Player**: LauraTV-owned fullscreen container with iframe stream sync.
  - **Compact Control Bar**: Microphones, cameras, volume slider, streaming provider selector (Apollo, Athena, Hermes, Poseidon, Zeus, Hades, Erebus), invite button, chat/people drawer toggles, and leave button.
  - **Right-Side Drawer**: Tabbed panel for ephemeral **Chat** and **People** (showing host crown `👑`, participant status, and mic/camera indicators).
  - **Clean Fullscreen**: Translucent floating camera tiles for active video participants only (omitted if camera is off), auto-hiding after 2.5s of inactivity.
- **Ephemerality & Security**:
  - Participant identities, tokens, WebRTC session descriptions, and chat messages are **never** persisted to databases.
  - Supabase persistence snapshots expire after **15 minutes of inactivity**. In-memory empty rooms clean up after **60 seconds**, and disconnect grace is **30 seconds**.
  - When an inactive room is restored from Supabase, the first participant to join becomes host.
  - Secret TMDB ID numeric searches remain functional in search without exposing TMDB IDs.
  - Full support for TV Specials (Season 0) across all sync adapters and persistence layers.

---

## 🏗️ Structure

```text
laura-tv/
├── web/                  # Vite + React 19 + TypeScript Frontend (Deployable to Vercel)
│   ├── public/
│   ├── src/
│   │   ├── components/   # Layout, Navbar, Footer, MediaCard, MediaGrid, ContentRow
│   │   ├── config/       # theme.ts, cowatch-ui.ts, public-url.ts
│   │   ├── features/     # home, movies, tv, search, player, cowatch, watchlist, profile
│   │   ├── hooks/        # useKeyboardShortcuts.ts
│   │   └── services/     # TMDB media API client
│   ├── vite.config.ts
│   └── package.json
├── server/               # Fastify 5 + TypeScript + Socket.IO Backend (Deployable to Railway/Render)
│   ├── src/
│   │   ├── database/     # Supabase rooms repository & SQL schema
│   │   ├── realtime/     # RoomStore, SlugUtils, Socket.IO handlers, sync clock
│   │   └── server.ts
│   └── package.json
├── docs/
│   ├── architecture.md
│   └── migrations/
│       ├── 001_cowatch_rooms.sql
│       └── 002_add_cowatch_share_slug.sql
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- npm >= 10

### Workspace installation
```bash
npm ci
```

The web and server are also independently installable from their own directories:

```bash
cd web
npm ci
npm run build

cd ../server
npm ci
npm run build
```

### Database Setup (Supabase)
Run the migrations in the Supabase SQL Editor in this order:

1. Fresh project: `docs/migrations/001_cowatch_rooms.sql`
2. Existing project created before private share slugs: `docs/migrations/002_add_cowatch_share_slug.sql`

Migration `002` is additive. It keeps existing rows, adds a nullable, uniquely indexed `share_slug` column, and ensures the server-side `service_role` can access the upgraded table through the Supabase Data API. Never expose the service-role key to the web deployment.

### Development
Start both frontend and backend:
```bash
npm run dev
```

Or run independently from the repository root:
```bash
# Web only (http://localhost:3173)
npm run dev:web

# Server only (http://localhost:3000)
npm run dev:server
```

From an independently deployed directory, use `npm run dev` in either `web/` or `server/`.

---

## 🧪 Testing

```bash
# Server realtime & persistence test suite
npm test --prefix server

# Web Cowatch & layout test suite
npm run test:cowatch --prefix web

# Full workspace build and lint
npm run build
npm run lint
```

---

## Environment contract

Copy only the relevant example file for each deployable unit. Do not commit populated `.env` files.

### Web (`web/.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Existing media REST API base, including `/api/v1` |
| `VITE_COWATCH_URL` | Independently deployed Fastify + Socket.IO origin, without `/api/v1` |
| `VITE_COWATCH_PUBLIC_URL` | Canonical public web origin used for private room links |
| `VITE_DEVTOOLS_PROTECTION` | Optional production protection toggle; keep `false` for QA |

Production values must use public HTTPS origins. `VITE_API_BASE_URL` and `VITE_COWATCH_URL` are intentionally separate and must not be merged.

### Server (`server/.env.example`)

| Variable group | Variables |
|---|---|
| Runtime and existing media API | `PORT`, `TMDB_API_TOKEN`, `CACHE_TTL_SECONDS`, `CORS_ORIGINS` |
| Persistence selection | `COWATCH_PERSISTENCE_MODE=memory|supabase` |
| Supabase server credentials | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Room lifecycle | `COWATCH_MAX_PARTICIPANTS`, `COWATCH_ROOM_CODE_LENGTH`, `COWATCH_HOST_RECONNECT_GRACE_MS`, `COWATCH_EMPTY_ROOM_EXPIRY_MS`, `COWATCH_ROOM_INACTIVITY_MS`, `COWATCH_HEARTBEAT_INTERVAL_MS`, `COWATCH_CLEANUP_INTERVAL_MS`, `COWATCH_KICK_REJOIN_COOLDOWN_MS` |
| Playback and providers | `COWATCH_SYNC_INTERVAL_MS`, `COWATCH_DRIFT_TOLERANCE_SECONDS`, `COWATCH_MAX_TIMELINE_SECONDS` |
| Chat and call | `COWATCH_CHAT_MAX_MESSAGE_LENGTH`, `COWATCH_CHAT_MAX_RECENT_MESSAGES`, `COWATCH_ICE_SERVERS_JSON`, `COWATCH_MAX_SDP_LENGTH`, `COWATCH_MAX_ICE_CANDIDATE_LENGTH` |
| Abuse controls | `COWATCH_MAX_EVENTS_PER_WINDOW`, `COWATCH_EXTREME_EVENTS_PER_WINDOW`, `COWATCH_TEMPORARY_BAN_MS`, `COWATCH_TRUST_PROXY` |

`memory` mode performs no database work. `supabase` mode requires both Supabase variables and verifies the `cowatch_rooms` table before the server starts; it never silently downgrades to memory.

---

## Independent production deployment

### Web

Set the deployment root to `web/`, install with `npm ci`, build with `npm run build`, and publish `web/dist`. For a Node-based static preview, run `npm start`. Configure SPA fallback routing so known routes and private root share slugs resolve to `index.html`.

Canonical private invites use `https://watch.theunfilteredgoose.in/<share_slug>`. Existing routes such as `/movies`, `/search`, `/watch/:mediaId`, and `/room/:roomCode` remain explicit routes and are not treated as share slugs.

### Server

Set the deployment root to `server/`, install with `npm ci`, build with `npm run build`, and start with `npm start`. The host must support a long-lived Node process and Socket.IO WebSocket upgrades. Configure `CORS_ORIGINS` with the exact public web origin and set `COWATCH_TRUST_PROXY=true` only behind a trusted proxy that supplies the client address.

For persistent rooms, apply the migrations first, set `COWATCH_PERSISTENCE_MODE=supabase`, then provide the server-only Supabase URL and service-role key. `/health` reports the selected Cowatch persistence mode after successful startup.
