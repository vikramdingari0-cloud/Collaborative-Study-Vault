# Backend — Collaborative Study Vault

This is the Node.js + Express API server for **Collaborative Study Vault**. It handles authentication, workspace management, real-time collaboration (via Socket.io), file uploads, and all the AI-powered study features.

## What it does

- **Auth** — register, login, logout, and guest login. Passwords are hashed with bcrypt. Sessions use JWT tokens stored in HTTP-only cookies (no localStorage tokens floating around).
- **Workspaces** — create, join (via 6-char invite code), and manage collaborative study spaces. Each workspace has its own folders, notes, chat, forum, and file storage.
- **Notes** — CRUD operations on markdown notes with version history. Supports real-time collaborative editing through Socket.io (edit locking prevents conflicts).
- **AI study tools** — generate summaries, flashcards, and active-recall quizzes from note content. Uses Google Gemini 2.0 Flash when an API key is available, otherwise falls back to a local NLP engine that works offline.
- **Chat** — persistent group chat per workspace. Supports `/ai` commands so users can ask the AI tutor questions directly from chat.
- **Quizzes** — generate, take, and score quizzes. Questions are stored in MongoDB so they persist across sessions.
- **Forum** — threaded Q&A board per workspace for doubt clearance.
- **File uploads** — upload files and past papers to workspaces. Uses Cloudinary for cloud storage when configured, with local `uploads/` fallback.
- **Whiteboard** — real-time collaborative drawing. Stroke data is broadcast via sockets.
- **Guest accounts** — auto-generated guest users with 24-hour TTL. A background job cleans them up.

## Tech stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Database | MongoDB (Mongoose 8) |
| Real-time | Socket.io |
| Auth | JWT + bcryptjs |
| AI | Google Gemini API (+ local fallback) |
| File uploads | Multer + Cloudinary |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston |
| Validation | express-validator |

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database (Atlas recommended, local works too)

### Install dependencies

```bash
cd backend
npm install
```

### Environment setup

Copy the example and fill in your values:

```bash
cp .env.example .env
```

The important ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Random string for signing tokens |
| `PORT` | No | Defaults to 5000 |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | No | For CORS — defaults to `http://localhost:5173` |
| `GEMINI_API_KEY` | No | Google Gemini API key. Skip it and AI falls back to local engine |
| `FORCE_LOCAL_AI` | No | Set to `true` to always use the local AI (good for demos) |
| `CLOUDINARY_*` | No | Cloud name, API key, API secret for file uploads |

### MongoDB Atlas setup (recommended)

If you're on Windows and get `querySrv ECONNREFUSED` errors, uncomment this in `.env`:

```env
MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1
```

This overrides Node's DNS resolver to use Google/Cloudflare DNS, which fixes SRV lookup issues on some networks.

### Test database connection

```bash
npm run db:test
```

Should print `MongoDB connected` and the database name.

### Seed demo data

```bash
npm run seed
```

Creates a demo user and a pre-built workspace:

| | Value |
|-|-------|
| Email | `recruiter@university.edu` |
| Password | `password123` |
| Workspace | Organic Chemistry II |
| Join code | `SV9D4A` |

### Start the server

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

The server starts on `http://localhost:5000` by default.

## API routes

All routes are prefixed with `/api`.

| Route | Methods | What it handles |
|-------|---------|----------------|
| `/api/auth` | POST | Register, login, logout, guest login, session check |
| `/api/workspaces` | GET, POST, PUT, DELETE | CRUD workspaces, join/leave, members |
| `/api/notes` | GET, POST, PUT, DELETE | CRUD notes, version history |
| `/api/folders` | GET, POST, PUT, DELETE | Folder management within workspaces |
| `/api/files` | GET, POST, DELETE | File upload/download/delete |
| `/api/chat` | GET, POST | Chat message history |
| `/api/ai` | POST | AI summarize, flashcards, quiz generation |
| `/api/quiz` | GET, POST, PUT | Quiz CRUD, take quiz, get scores |
| `/api/forum` | GET, POST, PUT, DELETE | Forum threads and replies |
| `/api/past-papers` | GET, POST, DELETE | Past paper upload and listing |
| `/api/health` | GET | Health check (returns server status + DB state) |

## Socket.io events

The server uses several socket namespaces/rooms for real-time features:

- **Chat** — `join-chat`, `send-message`, `receive-message`
- **Notes** — `join-note`, `note-update`, `note-lock`, `note-unlock`
- **Whiteboard** — `join-whiteboard`, `draw`, `clear-whiteboard`
- **Presence** — `user-online`, `user-offline`, online user list

All socket connections are authenticated — the server validates the JWT cookie before allowing the connection.

## Folder structure

```
backend/
├── server.js               # Entry point — Express + Socket.io setup
├── package.json
├── .env.example            # Template for environment variables
├── scripts/
│   ├── test-db-connection.js   # Quick DB connectivity check
│   └── fix-note-content.js     # One-off migration script
├── tests/                  # Test files
├── uploads/                # Local file upload directory (dev)
└── src/
    ├── config/
    │   ├── db.js           # MongoDB connection (with DNS workaround)
    │   ├── mongoDns.js     # Custom DNS resolver for SRV issues
    │   ├── socket.js       # Socket.io initialization + CORS
    │   ├── seed.js         # Database seeder
    │   └── cloudinary.js   # Cloudinary config
    ├── controllers/        # Route handlers
    │   ├── authController.js
    │   ├── workspaceController.js
    │   ├── noteController.js
    │   ├── aiController.js
    │   ├── chatController.js
    │   ├── quizController.js
    │   ├── fileController.js
    │   ├── folderController.js
    │   ├── forumController.js
    │   └── pastPaperController.js
    ├── models/             # Mongoose schemas
    │   ├── User.js         # User (with guest TTL index)
    │   ├── Workspace.js    # Workspace + members + roles
    │   ├── Note.js         # Notes with version history
    │   ├── Chat.js         # Chat messages
    │   ├── Quiz.js         # Quiz questions + attempts
    │   ├── File.js
    │   ├── Folder.js
    │   ├── ForumThread.js
    │   └── PastPaper.js
    ├── routes/             # Express route definitions
    ├── middleware/          # Auth middleware, error handler
    ├── services/           # Business logic layer
    │   └── aiService.js    # AI engine (Gemini + local fallback)
    ├── ai/                 # Local AI engine (no API needed)
    ├── sockets/            # Socket event handlers
    ├── utils/
    │   └── geminiClient.js # Gemini REST client with rate limiting
    ├── validators/         # Input validation rules
    └── jobs/               # Background tasks (guest cleanup, etc.)
```

## AI engine

The AI system has two modes:

1. **Gemini mode** — sends note content to the Google Gemini 2.0 Flash API and parses the response. Supports summary, flashcard, and quiz generation. If the API returns a 429 (rate limit), the system automatically cools down for 15 minutes and switches to local mode.

2. **Local mode** — a rule-based NLP engine that runs entirely on the server. It extracts key terms, generates fill-in-the-blank questions, and creates basic summaries. No API key needed. Good enough for demos.

You can force local mode with `FORCE_LOCAL_AI=true` in `.env`.

## Security

- Passwords hashed with bcrypt (salt rounds = 12)
- JWT tokens in HTTP-only cookies (not accessible from JavaScript)
- Helmet for HTTP security headers
- CORS whitelist (only the frontend origin is allowed)
- Rate limiting on auth routes (prevents brute force)
- Input validation on all routes via express-validator
- File upload size limits via Multer

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Production start |
| `npm run seed` | Seed demo data into MongoDB |
| `npm run db:test` | Test MongoDB connectivity |
| `npm run fix:notes` | One-off script to fix note content format |

## Deployment

Deployed on **Render** as a web service.

On Render, set these environment variables:

- `MONGO_URI` — your Atlas connection string
- `JWT_SECRET` — a strong random string
- `NODE_ENV` — `production`
- `FRONTEND_URL` — your frontend's deployed URL (for CORS)
- `GEMINI_API_KEY` — optional, for AI features

Build command: `npm install`
Start command: `npm start`
