# Project Report: Collaborative Study Vault

**Project Title**: COLLABORATIVE STUDY VAULT  
**Student Name**: DINGARI VIKRAM  
**Roll No.**: 24EG105K19  
**Course**: Bachelor of Technology, Computer Science & Engineering  
**Institution**: Anurag University, Hyderabad  
**Academic Year**: 2025-2026  

---

<div style="page-break-after: always;"></div>

## CERTIFICATE

This is to certify that the project report entitled **“COLLABORATIVE STUDY VAULT”** is a bonafide work carried out by **DINGARI VIKRAM (Roll No: 24EG105K19)**, student of Bachelor of Technology in Computer Science & Engineering at Anurag University, Hyderabad, in partial fulfilment of the academic requirements for the degree.

The results embodied in this report have not been submitted to any other university or institute for the award of any degree.

---

<div style="page-break-after: always;"></div>

## DECLARATION

I, DINGARI VIKRAM, bearing Hall Ticket Number 24EG105K19, hereby declare that the project report entitled **“COLLABORATIVE STUDY VAULT”** submitted to the Department of Computer Science and Engineering, Anurag University, is an original work carried out by me. The material compiled in this report has not been submitted elsewhere for the award of any other degree or diploma.

---

<div style="page-break-after: always;"></div>

## ABSTRACT

In the modern digital education era, structured real-time collaboration and intelligent feedback systems are essential for optimizing student learning processes and maximizing retention. The **COLLABORATIVE STUDY VAULT** is a web-based educational workspace application designed to streamline student workflow. It provides real-time co-authoring notes, synchronized whiteboards, and adaptive AI-generated recall materials. Built using the MERN stack (MongoDB, Express.js, React.js, Node.js) with Vite, and integrated with Google Gemini 1.5 Flash API, the platform delivers a modern, high-performance, and secure environment for learning.

---

<div style="page-break-after: always;"></div>

## TABLE OF CONTENTS
1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Objectives & Scope](#3-objectives--scope)
4. [Existing System vs Proposed System](#4-existing-system-vs-proposed-system)
5. [System Requirements](#5-system-requirements)
6. [System Design & Architecture](#6-system-design--architecture)
7. [Module Description](#7-module-description)
8. [Core Source Code](#8-core-source-code)
9. [Testing & Result Screens](#9-testing--result-screens)
10. [Advantages & Future Scope](#10-advantages--future-scope)
11. [Conclusion & References](#11-conclusion--references)

---

<div style="page-break-after: always;"></div>

## 1. INTRODUCTION
Collaborative study tools are crucial in bridging gaps between passive reading and active retention. Most mainstream platforms suffer from severe fragmentation, forcing students to juggle one application for markdown notes, another for visual drawing whiteboards, and a third for scheduling peer discussions or creating flashcards. This fragmentation introduces cognitive friction and lowers student focus. The Collaborative Study Vault solves these issues by aggregating note editing, whiteboard drawing, tutor chat, and active recall assessments into a unified workspace.

---

<div style="page-break-after: always;"></div>

## 2. PROBLEM STATEMENT
Existing educational products fail to support comprehensive student study workflows due to the following critical limitations:
- **Cognitive fragmentation** from juggling isolated applications (e.g. Notion, Miro, and Quizlet) during study sessions.
- **Lack of real-time** multi-user document and whiteboard collaboration, causing synchronization conflicts.
- **High eye strain** caused by static light-themed layouts lacking dark-mode styling controls.
- **Absence of automated active recall tools**, requiring manual question generation.
- **Poor security structures**, rendering platforms vulnerable to cookie theft, cross-site request forgery, and data leaks.

---

<div style="page-break-after: always;"></div>

## 3. OBJECTIVES & SCOPE
### Objectives
1. Develop a high-performance MERN-stack collaborative workspace platform.
2. Implement a resizable 3-panel layout separating library indices, document tabs, and AI toolsets.
3. Embed a real-time vector whiteboard supporting lines, shapes, brush strokes, and socket-based replication.
4. Integrate Google Gemini 1.5 Flash API to analyze canvas drawings and generate summaries, flashcards, and quizzes.
5. Guarantee application security via CSRF token validation and HttpOnly JWT cookie management.

### Scope
The scope encompasses establishing real-time WebSockets synchronization channels, designing scalable NoSQL databases, writing secure middleware APIs, and creating responsive glassmorphic interfaces optimized for dark mode.

---

<div style="page-break-after: always;"></div>

## 4. EXISTING SYSTEM VS PROPOSED SYSTEM
Proposed system features a highly interactive React-based frontend and a Node.js backend. Below is the architectural comparison:

| Feature | Existing Systems (Notion / Miro) | Proposed Collaborative Study Vault |
| :--- | :--- | :--- |
| **Integration** | Highly fragmented; separate apps required | All-in-one unified workspace |
| **Realtime Sync** | Basic text sync; drawing sync not unified | Websockets-based note and drawing synchronization |
| **AI Support** | Manual prompting or static text helpers | Gemini Vision canvas analysis & active recall quiz engine |
| **UI Aesthetics** | White-background; high eye-strain during night | Navy-theme glassmorphism; adjustable layout panels |
| **Session Security** | Vulnerable to basic CSRF & XSS cookie theft | HttpOnly tokens, double-cookie headers, CSRF validation |

---

<div style="page-break-after: always;"></div>

## 5. SYSTEM REQUIREMENTS
### Software Requirements
- **Operating System**: Windows 10/11, macOS, or Linux
- **Runtime**: Node.js (v18.x or above)
- **Database**: MongoDB Atlas (NoSQL cloud cluster)
- **Client Framework**: React.js (v18.x) with Vite
- **Styling**: Vanilla CSS Variables & Layout Utilities
- **API Client**: Postman (for endpoint validation)
- **Code Editor**: Visual Studio Code or Cursor IDE

### Hardware Requirements
- **Processor**: Intel Core i3 / AMD Ryzen 3 or above
- **RAM**: 8 GB minimum
- **Storage**: 20 GB free space
- **Network**: 10 Mbps broadband connection

---

<div style="page-break-after: always;"></div>

## 6. SYSTEM DESIGN & ARCHITECTURE
The system adopts a classic three-tier architecture separating presentation, business logic, and databases. Clients interact via RESTful APIs and real-time Socket.io connections.

![System Architecture Diagram](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/system_architecture_diagram_1782903778913.png)

*Figure 6.1: Collaborative Study Vault Three-Tier System Architecture Diagram*

---

<div style="page-break-after: always;"></div>

## 7. MODULE DESCRIPTION
1. **Authentication & Security Module**: Handles secure registration, login, double-cookie CSRF validations, and guest cleanup.
2. **Resizable Workspace Module**: Implements mouse-drag panels allowing left-navigation, central-workspaces, and right-recall sets.
3. **Live Whiteboard Module**: Handles drawing coordinates replication via Socket.io and visual interpretations via Gemini Vision.
4. **Note Editor Module**: Houses file indexing structures, markdown renders, and revision locking handlers.
5. **Active Recall Module**: Harnesses Gemini 1.5 Flash to automatically compile flashcards and interactive quizzes.

---

<div style="page-break-after: always;"></div>

## 8. CORE SOURCE CODE
### Real-time Stroke Vector Handling
```javascript

// frontend/src/components/workspace/Whiteboard.jsx (Excerpt)
const handleDrawingMove = (e) => {
  if (!isDrawing) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const coords = getCoordinates(e);
  if (!coords) return;
  const rect = canvas.getBoundingClientRect();

  if (tool === "brush" || tool === "eraser") {
    const stroke = {
      type: tool,
      x1: lastPosRef.current.x / rect.width,
      y1: lastPosRef.current.y / rect.height,
      x2: coords.x / rect.width,
      y2: coords.y / rect.height,
      color: tool === "eraser" ? "#000000" : color,
      lineWidth,
      isEraser: tool === "eraser"
    };
    drawStrokeObject(ctx, stroke, rect.width, rect.height);
    strokesHistoryRef.current.push(stroke);
    socket.emit("draw_stroke", { workspaceId, stroke });
    lastPosRef.current = coords;
  }
};

```

### AI Assessment Quiz Engine
```javascript

// backend/src/services/aiService.js (Excerpt)
const generateQuizFromNote = async (title, content, difficulty = "medium") => {
  const cleanContent = getCleanContent(content);
  const prompt = quizPrompt(title, cleanContent, difficulty);

  if (isConfigured()) {
    try {
      logger.info(`🤖 Requesting Gemini Quiz for note: "${title}" [Difficulty: ${difficulty}]`);
      const result = await callGemini(prompt, {
        label: "quiz",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: quizResponseSchema,
        },
      });
      if (result?.text) return JSON.parse(result.text);
    } catch (err) {
      logger.warn(`Gemini quiz unavailable, using mock: ${err.message}`);
    }
  }
  return generateMockQuiz(title, cleanContent, difficulty);
};

```

### Resizable Panel Layout Hook
```javascript

// frontend/src/pages/WorkspacePage.jsx (Resizable Panel Logic)
const useResizablePanel = (initialWidth, isRight = false) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = isRight ? window.innerWidth - e.clientX : e.clientX;
    if (newWidth > 180 && newWidth < 500) {
      setWidth(newWidth);
    }
  }, [isResizing, isRight]);

  return { width, isResizing, startResizing, stopResizing, resize };
};

```

---

<div style="page-break-after: always;"></div>

## 9. TESTING & RESULT SCREENS
Detailed E2E verification of the navy-theme interfaces and AI functionalities was conducted. The following screenshots document the results:

### 9.1 Modern Landing Page
![Homepage screenshot](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/home_page_1782900028962.png)
*Figure 9.1: Collaborative Study Vault - Modern Landing Page*

### 9.2 User Dashboard
![Dashboard screenshot](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/dashboard_page_1782900057426.png)
*Figure 9.2: Collaborative Study Vault - User Dashboard*

### 9.3 Workspace Creation Modal
![Modal screenshot](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/modal_filled_1782900100774.png)
*Figure 9.3: Collaborative Study Vault - Interactive Workspace Creation*

### 9.4 3-Panel Workspace
![Workspace screenshot](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/workspace_page_1782900140992.png)
*Figure 9.4: Collaborative Study Vault - 3-Panel Workspace Note-taking Panel*

### 9.5 Live Whiteboard and AI Vision Panel
![Whiteboard screenshot](file:///C:/Users/91628/.gemini/antigravity-ide/brain/58bb726a-0e03-4511-91ac-88b9ffcd3eea/workspace_whiteboard_1782900159962.png)
*Figure 9.5: Collaborative Study Vault - Live Whiteboard and AI Vision Panel*

---

<div style="page-break-after: always;"></div>

## 10. ADVANTAGES & FUTURE SCOPE
### Advantages
- Drastic reduction of student cognitive friction via a unified workspace interface.
- Elimination of eye fatigue during night study sessions thanks to Navy dark mode styling.
- Adaptive automated assessments generating relevant questions directly from note contents.

### Future Scope
1. Integration of real-time WebRTC audio-video channels for voice study sessions.
2. Cloud hosting deployment on Render and MongoDB Atlas synchronization optimization.
3. PDF exporting and local print styling configurations.

---

<div style="page-break-after: always;"></div>

## 11. CONCLUSION & REFERENCES
### Conclusion
The Collaborative Study Vault successfully achieves its primary goals of establishing a unified, secure, and visually premium study workspace. The MERN stack handles data structures and real-time updates seamlessly, while Gemini 1.5 Flash provides high-value academic active recall resources. The application is ready to scale to assist modern learners globally.

### References
1. MDN Web Docs - HTML5 Canvas & WebSockets API Reference (2025)
2. React.js Official Documentation - Resilient Client Rendering & Hooks (2025)
3. Google Gemini API Specifications - Generative Language Client SDK (2025)
