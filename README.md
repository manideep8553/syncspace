# SyncSpace

A full-stack **real-time collaborative whiteboard and code editor**.

- **Frontend** — React 19 + TypeScript + Vite
  - **Monaco Editor** for collaborative code editing
  - **Konva.js (react-konva)** for the interactive whiteboard
  - **Yjs** CRDT + **y-websocket** provider for conflict-free document sync
  - **Socket.IO** for presence, cursors and typing events
- **Backend** — Node.js + Express + TypeScript
  - **Socket.IO** realtime layer
  - **Yjs** room server (`/yjs/...`) with Postgres persistence
  - **Prisma** + PostgreSQL for persistent application data
  - **JWT** authentication with `bcrypt` password hashing (12 rounds)
- Monorepo via **npm workspaces** with shared ESLint / Prettier / clean scripts.

> Docs note: this README documents the initial, locally-runnable build.

---

## Tech stack

| Concern | Tool |
| --- | --- |
| UI framework | React 19 + TypeScript + Vite 8 |
| Routing | React Router 7 |
| Code editor | Monaco Editor + `y-monaco` |
| Whiteboard | Konva 10 + `react-konva` |
| CRDT sync | Yjs 13 |
| Realtime transport | Socket.IO 4 (`/socket.io`) + `y-websocket` (`/yjs`) |
| REST API | Express 5 |
| Validation | Zod |
| Database | PostgreSQL + Prisma 6 |
| Auth | JWT (access token) + `bcryptjs` |
| Tooling | ESLint 9 (flat config), Prettier, `tsx`, concurrently |

---

## Repository layout

```
syncspace/
├── backend/                  # Express + Socket.IO + Yjs room server
│   ├── prisma/
│   │   ├── schema.prisma     # User / Workspace / Document models
│   │   └── seed.ts           # demo user, workspace and starter documents
│   └── src/
│       ├── routes/           # auth, workspaces, documents
│       ├── controllers/      # thin request/response layer
│       ├── services/         # business logic + zod schemas
│       ├── middleware/       # auth, validation, error handling
│       ├── ws/               # y-websocket server + Yjs<->Postgres persistence
│       │                      # + Socket.IO presence server
│       ├── utils/            # jwt, password, base64, room helpers, seed content
│       └── index.ts          # single HTTP server (REST + WS + Socket.IO)
├── frontend/                 # React app
│   └── src/
│       ├── components/
│       │   ├── ui/           # Button, Input, Modal, Avatar, Spinner…
│       │   ├── auth/         # login/register forms, route guard
│       │   ├── layout/       # app shell + sidebar
│       │   ├── documents/    # document cards + create modal
│       │   ├── workspace/    # workspace cards + invite/create modals
│       │   ├── editor/       # Monaco + y-monaco binding, presence bar
│       │   └── whiteboard/   # Konva stage, toolbar, shape views, cursors
│       ├── hooks/            # useAuth, useWhiteboard, useYjs, useDocument…
│       ├── context/          # Auth and Socket providers
│       ├── services/         # thin API clients
│       ├── lib/              # http, yjs, socket, monaco setup
│       ├── utils/            # helpers
│       └── pages/            # Home, Workspace, Editor, Board, Auth, 404
```

---

## Prerequisites

- **Node.js** `>= 20.19` (npm `>= 10`)
- **PostgreSQL** `>= 14` running locally

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/syncspace
JWT_SECRET=replace-with-a-long-random-string
```

Create the database if it doesn't exist yet:

```bash
createdb syncspace
```

### 3. Set up the database schema + seed data

```bash
npm run db:generate   # generate the Prisma client
npm run db:push       # create tables (dev sync)
npm run db:seed       # demo user + workspace + starter documents
```

> There is also `npm run setup` which runs install → generate → push → seed.

### 4. Start the app

```bash
npm run dev
```

- Frontend: **http://localhost:5173**
- Backend API + websockets: **http://localhost:4000**
- Health check: **http://localhost:4000/api/health**

### 5. Log in

Seeded demo account:

| Field | Value |
| --- | --- |
| Email | `demo@syncspace.dev` |
| Password | `demo1234` |

For a true multi-user test, register a second account, invite the first account to a
workspace (owner via **Invite teammate**), then open the same document in two browsers.

---

## Available scripts

Run from the repository root:

| Script | Description |
| --- | --- |
| `npm run dev` | Run backend and frontend concurrently (with watch) |
| `npm run dev:backend` | Backend only (`tsx watch`) |
| `npm run dev:frontend` | Vite dev server only |
| `npm run build` | Type-check + compile backend, build frontend |
| `npm run start` | Run the compiled backend (`node dist/index.js`) |
| `npm run lint` | ESLint for both workspaces |
| `npm run format` | Prettier write for both workspaces |
| `npm run typecheck` | `tsc --noEmit` for both workspaces |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | `prisma db push` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## How realtime collaboration works

Every document gets a stable **room name** derived from its id and type:

```
code-<docId>       # shared Y.Text "monaco" + Y.Map "meta" (language)
whiteboard-<docId> # shared Y.Array "shapes" of Y.Maps + Y.Map "meta" (background)
```

1. The frontend creates a `Y.Doc` and a `y-websocket` `WebsocketProvider` pointed at
   `ws://<host>/yjs/<room>?token=<jwt>` (dev: proxied through Vite).
2. The backend authenticates the upgrade request, verifies workspace membership for that
   document, then hands the socket to `setupWSConnection` (Yjs sync protocol v1).
3. On document creation the server uses `setContentInitializor` to hydrate the CRDT from
   the last state stored in PostgreSQL; every change is debounce-persisted back to the DB
   (flushed on graceful shutdown).
4. **Code editor**: `MonacoBinding` (from `y-monaco`) binds the shared `Y.Text` to the
   editor model and renders remote cursors/selections from the shared awareness protocol.
5. **Whiteboard**: `useWhiteboard` mirrors the `Y.Array<Y.Map>` of shapes into React via
   `observeDeep`; local drags/draws write back into Yjs so peers converge. A Konva
   `Transformer` handles select/resize/rotate, and Socket.IO broadcasts remote cursors.
6. **Socket.IO** (`/socket.io`) carries presence (join/leave lists), remote whiteboard
   cursors and typing events. All sockets and the REST API are on the **same** HTTP server.

---

## API overview

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Create account, returns `{ user, token }` |
| POST | `/api/auth/login` | — | Sign in |
| GET | `/api/auth/me` | JWT | Current user |
| GET/POST | `/api/workspaces` | JWT | List / create workspaces |
| GET/DELETE | `/api/workspaces/:id` | JWT | Detail / delete workspace |
| POST | `/api/workspaces/:id/members` | JWT (owner) | Invite by email |
| PATCH/DELETE | `/api/workspaces/:id/members/:memberId` | JWT (owner) | Change role / remove |
| GET/POST | `/api/documents` | JWT | List accessible / create |
| GET/PATCH/DELETE | `/api/documents/:id` | JWT | Detail / rename / delete |

All responses use `{ success, data }` (or `{ success, error }` on failure). Errors carry
HTTP status codes and a human-readable message.

---

## Security notes

- Passwords are hashed with `bcryptjs` (cost 12).
- JWTs are signed with a server-side secret; `JWT_SECRET` must be overridden in production.
- Websocket upgrades, Socket.IO connections and every REST route verify the token and the
  user's membership in the target workspace. A document's room is only accessible to its
  workspace members, and room kind must match the document type (`code` vs `whiteboard`).
- In production use HTTPS/WSS, tighten `CLIENT_URL`/CORS, and rotate secrets.

---

## Environment variables

**`backend/.env`**

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` | `4000` | HTTP + WS port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Token signing secret (min 16 chars) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS / Socket.IO origin |

**`frontend/.env`** (optional — empty uses the Vite dev proxy)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, e.g. `http://localhost:4000/api` |
| `VITE_WS_URL` | Yjs websocket base, e.g. `ws://localhost:4000/yjs` |