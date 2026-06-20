# Frontend — Collaborative Study Vault

This is the React frontend for **Collaborative Study Vault**. It's built with React 19 and Vite, and handles everything the user sees — login/register pages, the dashboard, workspaces, real-time note editing, chat, whiteboard, quizzes, and AI-powered study tools.

## What it does

- **Authentication UI** — sign up, log in, or jump in instantly with 1-click guest login (no email needed).
- **Dashboard** — lists all your workspaces, lets you create new ones, and join existing ones via invite code.
- **Workspace view** — folders, notes, files, past papers, forum, chat, whiteboard, and AI tools all live inside each workspace.
- **Markdown editor** — write notes in markdown with a live preview. Supports real-time collaborative editing via sockets (edit locking so two people don't clash).
- **Group chat** — real-time messaging inside each workspace. Supports `/ai` commands to ask the AI tutor questions right from the chat.
- **Whiteboard** — collaborative drawing canvas. Everyone in the workspace sees strokes in real-time.
- **AI study tools** — generate summaries, flashcards, and active-recall quizzes from your notes. Works with Google Gemini or falls back to a built-in local engine.
- **Forum** — threaded discussion board for each workspace (doubt clearance, Q&A).
- **Past papers** — upload and browse past exam papers organized by workspace.

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router v7 |
| HTTP client | Axios |
| Real-time | Socket.io Client |
| Icons | Lucide React |
| Sanitization | DOMPurify |
| Styling | Vanilla CSS (custom design system) |

## Getting started

### Prerequisites

- Node.js 18+ installed
- The backend server running (see `backend/README.md`)

### Install dependencies

```bash
cd frontend
npm install
```

### Environment

The app looks for a `VITE_API_URL` environment variable to know where the backend API lives. In development you usually don't need to set it — Vite's proxy handles it.

For production builds, set it to your deployed backend URL:

```bash
VITE_API_URL=https://your-backend.onrender.com
```

If `VITE_API_URL` isn't set, the app automatically falls back to the production URL configured in the code.

### Run the dev server

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). Vite proxies `/api` and `/socket.io` requests to the backend at `localhost:5000`.

### Build for production

```bash
npm run build
```

Output goes to `dist/`. The backend's Express server can serve this folder in production mode.

## Folder structure

```
frontend/
├── index.html              # Entry HTML
├── vite.config.js          # Vite config (proxy, build settings)
├── package.json
├── public/                 # Static assets
└── src/
    ├── main.jsx            # App entry point
    ├── App.jsx             # Root component
    ├── App.css             # Global app styles
    ├── index.css           # Design system / CSS variables
    ├── api/
    │   └── axiosInstance.js # Axios client (base URL, cookie auth)
    ├── context/
    │   └── AuthContext.jsx  # Auth state (login, logout, guest)
    ├── hooks/              # Custom React hooks
    ├── layouts/            # Page layout wrappers
    ├── pages/
    │   ├── HomePage.jsx        # Landing page
    │   ├── LoginPage.jsx       # Login form
    │   ├── RegisterPage.jsx    # Registration form
    │   ├── DashboardPage.jsx   # Workspace listing
    │   └── WorkspacePage.jsx   # Full workspace (notes, chat, AI, etc.)
    ├── components/
    │   ├── ui/             # Reusable UI elements (buttons, modals, etc.)
    │   ├── chat/           # Chat panel component
    │   ├── editor/         # Markdown editor + preview
    │   ├── onboarding/     # First-time user flow
    │   └── workspace/      # Whiteboard, QuizModal, Forum, PastPapers
    ├── services/           # API service functions
    ├── sockets/
    │   └── socket.js       # Socket.io client instance
    ├── routes/             # Route definitions
    ├── styles/             # Additional CSS modules
    └── utils/              # Helper functions
```

## Key design decisions

- **No state management library** — we keep it simple with React Context for auth state. Workspace data is fetched on mount and passed via props.
- **Socket.io for everything real-time** — notes, chat, whiteboard, and presence all go through the same socket connection. The socket auto-reconnects if the connection drops.
- **CSS-first approach** — no Tailwind or CSS-in-JS. The design system lives in `index.css` with CSS custom properties for colors, spacing, and typography. This keeps the bundle small and the styles predictable.
- **Graceful fallbacks** — if the backend AI is unavailable, the UI still works. Quiz generation and summaries just show a friendly error instead of crashing.

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

## Deployment

This frontend is deployed on **Render** as a static site. On Render:

1. Set build command to `npm install && npm run build`
2. Set publish directory to `dist`
3. Add environment variable `VITE_API_URL` pointing to your backend URL

Alternatively, the backend serves the built frontend in production mode — just run `npm run build` here, and start the backend with `NODE_ENV=production`.
