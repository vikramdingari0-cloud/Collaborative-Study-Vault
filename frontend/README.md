# Collaborative Study Vault - Frontend

Welcome to the frontend of the Collaborative Study Vault! This is the user-facing application where all the collaboration actually happens. It's a modern, sleek, and highly interactive React application built with Vite and Tailwind CSS.

##  Highlights & Features

- **Modern UI/UX**: Built with standard React and a beautiful custom glassmorphic styling system.
- **Real-Time Workspaces**: Jump into a workspace and see changes happen live.
- **Collaborative Whiteboard**: Draw, erase, and map out concepts with your peers in real-time. Supports grid backgrounds, different tools (brush, shapes), and image exports.
- **Live Chat & AI Tutor**: Chat with your study group, or use the `/ai` command to bring our AI Tutor into the conversation to help answer tricky questions!
- **AI Flashcards & Quizzes**: Instantly generate study materials based on your workspace notes using our AI engine.
- **Guest Login**: One-click demo access so you can try everything out without creating an account.

##  Tech Stack

- **React 18** (Bootstrapped with Vite for lightning-fast builds)
- **React Router DOM** for navigation
- **Socket.io-client** for connecting to our real-time backend
- **Axios** for API requests (configured with interceptors for seamless token refresh)
- **Lucide React** for crisp, scalable icons

##  Getting Started Locally

### 1. Prerequisites
Make sure you have Node.js installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the `frontend` directory. 

```env
# Point this to your local backend server
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
*Note: If these aren't set, the app will try to fall back to the production URLs automatically, but it's best to configure them for local development!*

### 4. Start the Dev Server
```bash
npm run dev
```
Vite should spin up the app incredibly fast, usually on `http://localhost:5173`.

### 5. Build for Production
To create a production-ready bundle:
```bash
npm run build
```
And to preview the built bundle:
```bash
npm run preview
```

## 📂 Project Structure

- `/src/api` - Axios instances and API helper functions.
- `/src/components` - Reusable UI components (buttons, modals, navbar) and feature-specific components (Workspace, Whiteboard, Flashcards).
- `/src/context` - React Contexts for global state management (Auth, Theme, Toasts).
- `/src/pages` - Main page views (Home, Dashboard, Login, Register, WorkspacePage).
- `/src/sockets` - Socket.io connection setup and event listeners.

## 🎨 Styling Notes
We utilize a highly customized stylesheet (`index.css`) designed to give the app a premium, "wow" factor out of the box with dynamic animations and dark-mode optimization.

Enjoy building and studying!
