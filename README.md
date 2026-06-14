 HEAD
# Collaborative Study Vault

AI-powered collaborative learning platform with real-time study workspaces, markdown notes, group chat, and Gemini-driven quizzes, summaries, and flashcards.

## Features

- **Study workspaces** — folders, notes, member roles, email invites, and 6-character join codes
- **Real-time collaboration** — live note sync, edit locks, presence, and group chat with `/ai` tutor commands
- **AI study tools** — summaries, flashcards, and active-recall quizzes (Gemini API or built-in mock engine)
- **Guest demo mode** — 1-click guest login with automatic 24-hour cleanup
- **Version history** — restore previous note versions

## Tech stack

- **Frontend:** React 19, Vite, React Router, Socket.io client
- **Backend:** Node.js, Express 5, MongoDB, Socket.io, JWT (HTTP-only cookies)
- **AI:** Google Gemini 2.0 Flash (optional; works without an API key)

## Quick start

### 1. Environment

Copy the backend environment template:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:

- `MONGO_URI` — **MongoDB Atlas** connection string (see below)
- `JWT_SECRET` — strong random string
- `GEMINI_API_KEY` — optional; omit to use the local mock AI engine

### MongoDB Atlas (fixes notes not saving)

If notes do not save, the app is usually pointed at **local** MongoDB (`127.0.0.1`) while MongoDB is not running on your PC.

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → create a free cluster.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → **Add IP Address** → allow `0.0.0.0/0` for development (or your current IP).
4. **Connect** → **Drivers** → copy the `mongodb+srv://...` string.
5. Edit the string:
   - Replace `<password>` with your password. If the password has `@`, `#`, or `%`, [URL-encode](https://www.urlencoder.org/) it.
   - Ensure a **database name** is in the path: `...mongodb.net/collaborative-study-vault?retryWrites=...`
6. Paste into `backend/.env`:

```env
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/collaborative-study-vault?retryWrites=true&w=majority
```

7. Test the connection:

```bash
cd backend
npm run db:test
```

8. Restart the API, then seed demo data (optional):

```bash
npm run seed
npm run dev
```

When the server starts correctly you should see: `MongoDB connected: ...` and `Database name: collaborative-study-vault`.

### 2. Install dependencies

From the project root:

```bash
npm run install-all
```

### 3. Seed demo data (recommended)

Creates a recruiter demo account and pre-built Organic Chemistry workspace:

```bash
npm run seed
```

| Field | Value |
|-------|-------|
| Email | `recruiter@university.edu` |
| Password | `password123` |
| Join code | `SV9D4A` |

### 4. Run development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health check: http://localhost:5000/api/health (or http://localhost:5173/api/health while `npm run dev` is running — Vite proxies to the API)

**Important:** The health check is on the **backend** (port 5000), not the React app alone. Opening only `http://localhost:5173/` shows the study app UI, not the health JSON.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run install-all` | Install root, backend, and frontend dependencies |
| `npm run dev` | Run API and Vite dev servers together |
| `npm run seed` | Populate MongoDB with demo data |
| `npm run build` | Build frontend for production |
| `npm start` | Start production API (serves `frontend/dist`) |

## Production deployment

Set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`, then:

```bash
npm run build
npm start
```

The Express server serves the built React app from `frontend/dist`.

## Demo flow

1. Run `npm run seed`, then `npm run dev`.
2. Open http://localhost:5173 and use **1-Click Guest Login** or sign in as `recruiter@university.edu` / `password123`.
3. Open the **Organic Chemistry II** workspace, or join with code **SV9D4A**.
4. Open **Nucleophilic Acyl Substitutions**, generate a summary/quiz/flashcards, and test chat with `/ai explain this topic`.

## Project structure

```
Collaborative-Study-Vault/
├── backend/          # Express API + Socket.io
│   ├── server.js
│   └── src/
├── frontend/         # React + Vite SPA
│   └── src/
└── package.json      # Monorepo scripts
```

## Author

Dingari Vikram — MIT License
=======
# Collaborative-Study-Vault
●A real-time repository for class notes, past papers, and resources.
●Key Features: Topic-wise file uploading, upvote/downvote system for quality control, real-time shared "whiteboard" for group study, and a doubt clearance forum.

