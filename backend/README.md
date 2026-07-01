# Collaborative Study Vault - Backend

Hey! Welcome to the backend repository for the Collaborative Study Vault. This is the server-side logic powering the real-time study platform. It's built with Node.js, Express, and MongoDB, and acts as the brain behind all the cool features you see on the frontend.

##  What's in here?

We've got a lot going on under the hood to make the collaborative experience seamless:
- **Authentication**: JWT-based auth (access & refresh tokens via secure HttpOnly cookies). Includes a one-click Guest Login!
- **Real-Time Collaboration**: Powered by `socket.io`. Handles chat messages, AI tutor requests, and live whiteboard drawing.
- **AI Integration**: Custom AI services hook up to Google's Gemini API to act as a 24/7 study buddy. If the API key isn't set, it gracefully falls back to a mock AI engine, so the app never breaks!
- **Workspace Authorization**: Middleware that ensures users can only access and edit workspaces they actually belong to.
- **Robust Error Handling**: Centralized error middleware, input validation, and rate limiting to keep the server healthy.

##  Tech Stack

- **Node.js** & **Express.js**: Core framework.
- **MongoDB** & **Mongoose**: Database and ODM.
- **Socket.io**: WebSockets for real-time magic.
- **jsonwebtoken** & **bcryptjs**: For secure user sessions and password hashing.
- **Helmet** & **Cors**: Security out of the box.

## 📦 Getting Started Locally

### 1. Prerequisites
Make sure you have Node.js (v16+ recommended) and a running MongoDB instance (or MongoDB Atlas URI).

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in this directory. You can copy the structure from `.env.example` if it exists, but you'll need the following as a bare minimum:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=super_secret_jwt_key
JWT_REFRESH_SECRET=super_secret_refresh_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here # Optional, for AI features
```

### 4. Run the Server

**Development Mode** (uses nodemon for hot-reloading):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

### 5. Check Server Health
We have a quick script to verify if your database connection is solid:
```bash
npm run db:test
```

##  Folder Structure

- `/src/controllers` - Handles incoming HTTP requests and sends responses.
- `/src/models` - Mongoose schemas for Users, Workspaces, Notes, etc.
- `/src/routes` - Express route definitions.
- `/src/services` - The heavy lifting! Business logic for Auth, AI, Chat, etc.
- `/src/sockets` - Real-time event handlers for WebSockets.
- `/src/middleware` - Auth guards, workspace validation, and error catchers.

##  Contributing

If you're diving into the code, start by checking `server.js` to see how everything is wired up, then explore `/src/sockets` to see how the real-time whiteboard and chat are orchestrated. 

