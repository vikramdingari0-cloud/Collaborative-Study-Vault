# Collaborative Study Vault

A full-stack collaborative learning platform where students can create study workspaces, take notes together in real-time, chat, draw on a shared whiteboard, and use AI to generate quizzes, summaries, and flashcards from their notes.

Built this as a way to solve the problem of scattered study materials — instead of passing around Google Docs and WhatsApp groups, everything lives in one place.

## Live demo

| | URL |
|-|-----|
| Frontend | [collaborative-study-vault-1.onrender.com](https://collaborative-study-vault-1.onrender.com/) |
| Backend API | [collaborative-study-vault-kzjt.onrender.com](https://collaborative-study-vault-kzjt.onrender.com/) |

> **Tip:** Click **Guest Login** on the landing page to explore instantly — no sign-up needed.

## What you can do with it

- **Create study workspaces** — organize your study group. Each workspace gets its own folders, notes, chat, forum, whiteboard, and file storage. Invite people via email or a 6-character join code.

- **Write notes together** — markdown editor with live preview. When someone's editing a note, it locks for others (so you don't overwrite each other). Changes sync in real-time via WebSockets.

- **AI-powered study tools** — highlight a note and generate:
  - **Summaries** — condenses long notes into key points
  - **Flashcards** — term/definition pairs for quick review
  - **Quizzes** — active-recall multiple choice questions with scoring

  Uses Google Gemini 2.0 Flash when an API key is configured. Works without one too — there's a built-in local engine that handles the basics.

- **Group chat** — real-time messaging inside each workspace. Type `/ai <question>` to ask the AI tutor something directly in chat.

- **Shared whiteboard** — collaborative drawing canvas. Everyone sees strokes in real-time. Great for working through diagrams and problems together.

- **Discussion forum** — threaded Q&A board per workspace. Post questions, reply, and clear doubts.

- **Past papers** — upload and browse previous exam papers organized by workspace.

- **Guest mode** — one-click login with no email required. Guest accounts auto-delete after 24 hours.

- **Version history** — accidentally deleted your notes? Roll back to a previous version.

## Tech stack

| | Technology |
|-|-----------|
| **Frontend** | React 19, Vite 8, React Router v7, Socket.io Client, Axios, Lucide Icons |
| **Backend** | Node.js, Express 5, Socket.io, JWT (HTTP-only cookies), Multer, Winston |
| **Database** | MongoDB (Mongoose 8) |
| **AI** | Google Gemini 2.0 Flash API + local NLP fallback engine |
| **File storage** | Cloudinary (optional, falls back to local uploads) |
| **Deployment** | Render (frontend as static site, backend as web service) |

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/vikramdingari0-cloud/Collaborative-Study-Vault.git
cd Collaborative-Study-Vault
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

| Variable | Required? | What to put |
|----------|-----------|-------------|
| `MONGO_URI` | **Yes** | Your MongoDB connection string (Atlas recommended) |
| `JWT_SECRET` | **Yes** | Any long random string — used to sign auth tokens |
| `GEMINI_API_KEY` | No | Google Gemini API key. Leave blank to use the local AI engine |
| `FRONTEND_URL` | No | Defaults to `http://localhost:5173` |

<details>
<summary><strong>MongoDB Atlas setup (click to expand)</strong></summary>

If you don't have MongoDB installed locally, Atlas gives you a free cloud database:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and create a free cluster
2. **Database Access** → create a user with a password
3. **Network Access** → allow `0.0.0.0/0` (for development)
4. **Connect** → **Drivers** → copy the connection string
5. Replace `<password>` with your actual password (URL-encode special characters like `@` → `%40`)
6. Make sure there's a database name in the path: `.../collaborative-study-vault?retryWrites=true&w=majority`

**Windows DNS issue?** If you get `querySrv ECONNREFUSED`, add this to your `.env`:
```env
MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1
```

</details>

### 3. Install everything

```bash
npm run install-all
```

This installs dependencies for the root, backend, and frontend in one go.

### 4. Seed demo data (optional but recommended)

```bash
npm run seed
```

This creates a demo account and a pre-built workspace so you can test things immediately:

| | Value |
|-|-------|
| Email | `recruiter@university.edu` |
| Password | `password123` |
| Workspace | Organic Chemistry II |
| Join code | `SV9D4A` |

### 5. Start development servers

```bash
npm run dev
```

This runs both the backend API and the Vite dev server at the same time (using `concurrently`).

| | URL |
|-|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

## Try it out

1. Open http://localhost:5173
2. Click **Guest Login** (or sign in with the seeded account: `recruiter@university.edu` / `password123`)
3. Open the **Organic Chemistry II** workspace (or create your own)
4. Try editing a note — you'll see the markdown editor with live preview
5. Click the AI buttons to generate a summary, flashcards, or quiz
6. Open the chat panel and type `/ai explain nucleophilic substitution`
7. Try the whiteboard — draw something and open the same workspace in another tab to see it sync

## Project structure

```
Collaborative-Study-Vault/
├── backend/                # Node.js + Express API server
│   ├── server.js           #   Entry point
│   ├── src/
│   │   ├── config/         #   DB connection, socket setup, seeder
│   │   ├── controllers/    #   Route handlers (auth, notes, AI, etc.)
│   │   ├── models/         #   Mongoose schemas (User, Workspace, Note, etc.)
│   │   ├── routes/         #   Express route definitions
│   │   ├── middleware/     #   Auth middleware, error handling
│   │   ├── services/       #   Business logic (AI service)
│   │   ├── ai/            #   Local AI engine (no API key needed)
│   │   ├── sockets/       #   Socket.io event handlers
│   │   ├── utils/         #   Gemini client, helpers
│   │   ├── validators/    #   Input validation
│   │   └── jobs/          #   Background jobs (guest cleanup)
│   ├── scripts/           #   DB test, migration scripts
│   └── .env.example       #   Environment variable template
│
├── frontend/               # React + Vite SPA
│   ├── index.html          #   Entry HTML
│   ├── vite.config.js      #   Vite config (proxy, build)
│   └── src/
│       ├── pages/          #   Home, Login, Register, Dashboard, Workspace
│       ├── components/     #   UI, Chat, Editor, Whiteboard, Forum, Quiz
│       ├── context/        #   Auth context (login state)
│       ├── api/            #   Axios instance
│       ├── sockets/        #   Socket.io client
│       ├── services/       #   API service functions
│       ├── hooks/          #   Custom React hooks
│       ├── layouts/        #   Page layout wrappers
│       ├── routes/         #   Route definitions
│       └── styles/         #   CSS modules
│
├── docs/                   # Documentation
└── package.json            # Monorepo scripts (install-all, dev, build, etc.)
```

## Scripts (from project root)

| Command | What it does |
|---------|-------------|
| `npm run install-all` | Installs deps for root + backend + frontend |
| `npm run dev` | Runs backend and frontend dev servers together |
| `npm run seed` | Seeds MongoDB with demo data |
| `npm run build` | Builds the frontend for production |
| `npm start` | Starts the production backend (serves built frontend) |
| `npm run db:test` | Tests MongoDB connectivity |

## Deploying to production

The app is deployed on [Render](https://render.com) with the frontend and backend as separate services.

### Backend (Web Service)

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:** `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`

### Frontend (Static Site)

- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Environment variable:** `VITE_API_URL=https://your-backend.onrender.com`

### Single-server deployment (alternative)

You can also run everything on one server. The Express backend serves the built React app from `frontend/dist/` when `NODE_ENV=production`:

```bash
npm run build
NODE_ENV=production npm start
```

## How the AI works

The AI system has a dual-engine setup:

1. **Gemini mode** — when `GEMINI_API_KEY` is set, the app sends note content to Google's Gemini 2.0 Flash model. It generates structured summaries, flashcard sets, and multiple-choice quizzes. If Gemini rate-limits the request (429 error), the system automatically falls back to local mode for 15 minutes.

2. **Local mode** — a rule-based NLP engine that runs on the server with zero external dependencies. It extracts key terms, builds fill-in-the-blank questions, and creates basic summaries. Not as good as Gemini, but works perfectly fine for demos and testing.

Set `FORCE_LOCAL_AI=true` in your `.env` to always use local mode (handy if you don't have a Gemini API key or don't want to worry about rate limits during a demo).

## Author

**Dingari Vikram**

- GitHub: [@vikramdingari0-cloud](https://github.com/vikramdingari0-cloud)

## License

MIT
