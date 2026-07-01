# Collaborative Study Vault 

Welcome to the **Collaborative Study Vault**! This is a comprehensive, real-time study platform designed to bring students together in collaborative workspaces. Whether you're mapping out complex concepts on a shared whiteboard, chatting about assignments, or getting help from a built-in AI Tutor, this platform has you covered.

##  Key Features

### 1. Collaborative Workspaces
Create or join dedicated workspaces for your study sessions. Invite peers, share notes, and collaborate in real-time.

### 2. Real-Time Whiteboard
A highly responsive, real-time shared drawing canvas. It supports freehand drawing, shape tools, grid backgrounds, and instant synchronization across all connected clients.

### 3. Integrated AI Tutor
Stuck on a concept? Type `/ai` in the workspace chat to invoke our Gemini-powered AI Tutor. It reads your workspace notes and chat history to provide context-aware, highly relevant answers to your questions.

### 4. AI-Generated Flashcards & Quizzes
Turn your workspace notes into study materials instantly! With one click, our AI reads your notes and generates custom flashcards and multiple-choice quizzes to test your knowledge.

### 5. Secure Authentication
Robust user accounts secured with JWTs (utilizing both access and refresh tokens stored in HttpOnly cookies). 
*Want to just take a look around? Use the 1-click **Guest Login** to immediately explore the platform without signing up!*

### 6. Live Chat
Chat with your study group in real-time. Every workspace comes with a dedicated chat room for text and AI interactions.

##  System Architecture

This project is a monorepo separated into a `frontend` and `backend`.

- **Frontend**: A modern React application built with Vite. It features a custom glassmorphic design system and leverages Socket.io-client for real-time interactivity.
- **Backend**: A robust Node.js and Express server connected to MongoDB. It handles authentication, API routes, AI service orchestration, and manages the Socket.io server for real-time collaboration.

##  Getting Started

To run this project locally, you will need to start both the backend and frontend servers.

### 1. Clone the Repository
```bash
git clone https://github.com/vikramdingari0-cloud/Collaborative-Study-Vault.git
cd Collaborative-Study-Vault
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=super_secret
JWT_REFRESH_SECRET=super_secret_refresh
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here # For AI Features
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
Start the frontend server:
```bash
npm run dev
```

### 4. Explore
Open your browser to `http://localhost:5173` and click the "Guest Demo Login" button to dive straight into a workspace!

##  Project Health & Reliability

This project is built with reliability in mind:
- **AI Fallbacks**: If the Gemini API rate-limits you or the key isn't set, the app won't crash. It seamlessly switches to a Mock AI Engine to ensure you can keep studying.
- **Connection Resilience**: Fallback URLs are configured in the frontend so that if local environment variables are missing, it attempts to connect to the production environment.
- **Security**: Strict CORS policies, Helmet security headers, and rate limiting are enforced on the backend.

---
Built for seamless studying and collaboration. 🧠⚡
