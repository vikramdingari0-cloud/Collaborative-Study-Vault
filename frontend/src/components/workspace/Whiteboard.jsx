import React, { useRef, useState, useEffect } from "react";
import { socket } from "../../sockets/socket";
import { useToast } from "../../context/ToastContext";
import axiosInstance from "../../api/axiosInstance";
import TextToSpeechButton from "../common/TextToSpeechButton";

/**
 * Whiteboard - Highly Upgraded Real-time Collaborative Shared Drawing Canvas.
 * Supports:
 * - Freehand Brush & Eraser
 * - Shape tools: Straight Line, Rectangle, Circle
 * - Grid backgrounds: Blank, Dots Grid, Line Grid
 * - Collaborative Undo (pops last stroke)
 * - Canvas Export as Image (PNG)
 * - Coordinates normalized (0-1) for device aspect ratio scaling
 */
const Whiteboard = ({ workspaceId, currentUser }) => {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Whiteboard configuration states
  const [tool, setTool] = useState("brush"); // "brush" | "line" | "rect" | "circle" | "eraser"
  const [color, setColor] = useState("#6366f1");
  const [lineWidth, setLineWidth] = useState(5);
  const [gridType, setGridType] = useState("dots"); // "none" | "dots" | "grid"
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");

  // Keep a local cache of all drawing strokes to support shape previews & redraws
  const strokesHistoryRef = useRef([]);
  // Start coordinate for the current drag action
  const startPosRef = useRef({ x: 0, y: 0 });
  // Last coordinate for continuous freehand segment drawing
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Color palette presets
  const colors = [
    { name: "Indigo", value: "#6366f1" },
    { name: "Green", value: "#10b981" },
    { name: "Red", value: "#ef4444" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Blue", value: "#3b82f6" },
    { name: "White", value: "#ffffff" }
  ];

  // Draw grid helper
  const drawBackgroundGrid = (ctx, width, height, type) => {
    if (type === "none") return;
    
    ctx.save();
    if (type === "grid") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 25;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (type === "dots") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      const spacing = 20;
      const dotRadius = 1;
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  // Main drawing engine for a single stroke object
  const drawStrokeObject = (ctx, stroke, rectWidth, rectHeight) => {
    const x1 = stroke.x1 * rectWidth;
    const y1 = stroke.y1 * rectHeight;
    const x2 = stroke.x2 * rectWidth;
    const y2 = stroke.y2 * rectHeight;

    ctx.save();
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const isEraserTool = stroke.isEraser || stroke.type === "eraser";

    if (isEraserTool) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
    }

    const strokeType = stroke.type || "brush";

    if (strokeType === "brush" || strokeType === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (strokeType === "line") {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (strokeType === "rect") {
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();
    } else if (strokeType === "circle") {
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      ctx.beginPath();
      ctx.arc(x1, y1, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Full canvas redraw
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // 1. Draw Grid
    drawBackgroundGrid(ctx, rect.width, rect.height, gridType);
    
    // 2. Redraw Stroke Logs
    strokesHistoryRef.current.forEach((stroke) => {
      drawStrokeObject(ctx, stroke, rect.width, rect.height);
    });
  };

  // Re-render when grid background type changes
  useEffect(() => {
    redrawCanvas();
  }, [gridType]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Mouse / Touch Downs
  const handleStartDrawing = (e) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    startPosRef.current = coords;
    lastPosRef.current = coords;
  };

  // Mouse / Touch Moves
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
      // Freehand tools draw segment by segment and emit in real-time
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

      // Draw locally immediately
      drawStrokeObject(ctx, stroke, rect.width, rect.height);
      strokesHistoryRef.current.push(stroke);

      // Emit to server
      socket.emit("draw_stroke", { workspaceId, stroke });
      lastPosRef.current = coords;
    } else {
      // Shape tools redraw history + temp shape preview locally
      redrawCanvas();
      
      const tempStroke = {
        type: tool,
        x1: startPosRef.current.x / rect.width,
        y1: startPosRef.current.y / rect.height,
        x2: coords.x / rect.width,
        y2: coords.y / rect.height,
        color,
        lineWidth,
        isEraser: false
      };
      drawStrokeObject(ctx, tempStroke, rect.width, rect.height);
    }
  };

  // Mouse / Touch Ups
  const handleStopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // If shape drawing, draw the final shape permanently and emit it
    if (tool !== "brush" && tool !== "eraser") {
      let coords = getCoordinates(e);
      // Fallback if touch end event doesn't supply coordinates
      if (!coords && e.changedTouches && e.changedTouches.length > 0) {
        const clientX = e.changedTouches[0].clientX;
        const clientY = e.changedTouches[0].clientY;
        coords = {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      }
      
      if (!coords) return;

      const stroke = {
        type: tool,
        x1: startPosRef.current.x / rect.width,
        y1: startPosRef.current.y / rect.height,
        x2: coords.x / rect.width,
        y2: coords.y / rect.height,
        color,
        lineWidth,
        isEraser: false
      };

      // Push to local cache
      strokesHistoryRef.current.push(stroke);
      redrawCanvas();

      // Emit finished shape
      socket.emit("draw_stroke", { workspaceId, stroke });
    }
  };

  // Undo triggers
  const handleUndo = () => {
    socket.emit("undo_stroke", { workspaceId });
  };

  // Clear canvas triggers
  const handleClearWhiteboard = () => {
    socket.emit("clear_whiteboard", { workspaceId });
  };

  // Export canvas as image file download
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to draw solid background, grid (if selected), and strokes
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    // Solid dark background
    exportCtx.fillStyle = "#0f0f13";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw grid
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    exportCtx.scale(dpr, dpr);
    drawBackgroundGrid(exportCtx, rect.width, rect.height, gridType);

    // Redraw all strokes
    strokesHistoryRef.current.forEach((stroke) => {
      drawStrokeObject(exportCtx, stroke, rect.width, rect.height);
    });

    const dataUrl = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard_${workspaceId}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Whiteboard exported as PNG");
  };

  const handleAnalyzeDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We must redraw onto an export canvas with a solid white background so the AI can see it clearly
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    // Solid white background for AI vision
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    exportCtx.scale(dpr, dpr);
    strokesHistoryRef.current.forEach((stroke) => {
      // Force strokes to be visible on white bg (invert colors if necessary, though AI can figure it out)
      drawStrokeObject(exportCtx, stroke, rect.width, rect.height);
    });

    const dataUrl = exportCanvas.toDataURL("image/png");

    setIsAnalyzing(true);
    setAiAnalysis("");
    try {
      const res = await axiosInstance.post("/ai/analyze-image", { imageBase64: dataUrl });
      if (res.data?.success) {
        setAiAnalysis(res.data.data.explanation);
        toast.success("AI Analysis Complete");
      }
    } catch (err) {
      toast.error("AI Analysis failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Join room & bind reconnect resilience
    const joinAndSync = () => {
      socket.emit("join_whiteboard", { workspaceId });
    };

    socket.on("connect", joinAndSync);
    joinAndSync(); // Execute immediately

    // Listeners
    const handleReceiveStroke = (stroke) => {
      strokesHistoryRef.current.push(stroke);
      
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawStrokeObject(ctx, stroke, rect.width, rect.height);
      }
    };

    const handleWhiteboardHistory = (history) => {
      strokesHistoryRef.current = history;
      redrawCanvas();
    };

    const handleWhiteboardCleared = () => {
      strokesHistoryRef.current = [];
      redrawCanvas();
      toast.success("Whiteboard cleared");
    };

    socket.on("receive_stroke", handleReceiveStroke);
    socket.on("whiteboard_history", handleWhiteboardHistory);
    socket.on("whiteboard_cleared", handleWhiteboardCleared);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        redrawCanvas();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      socket.emit("leave_whiteboard", { workspaceId });
      socket.off("connect", joinAndSync);
      socket.off("receive_stroke", handleReceiveStroke);
      socket.off("whiteboard_history", handleWhiteboardHistory);
      socket.off("whiteboard_cleared", handleWhiteboardCleared);
      resizeObserver.disconnect();
    };
  }, [workspaceId]);

  return (
    <div className="whiteboard-wrapper d-flex flex-column h-100 position-relative" ref={containerRef}>
      
      {/* Floating Toolbar Controls */}
      <div className="whiteboard-toolbar glass-card d-flex align-items-center gap-3 p-3 position-absolute m-3 z-index-10">
        
        {/* Tool Mode Toggles */}
        <div className="d-flex bg-black-20 rounded-8 p-1 gap-1">
          <button
            type="button"
            className={`btn-toolbar-tool ${tool === "brush" ? "active bg-primary text-white" : "text-muted"}`}
            title="Freehand Brush"
            onClick={() => setTool("brush")}
          >
            🖌️ Brush
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool ${tool === "line" ? "active bg-primary text-white" : "text-muted"}`}
            title="Straight Line"
            onClick={() => setTool("line")}
          >
            📏 Line
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool ${tool === "rect" ? "active bg-primary text-white" : "text-muted"}`}
            title="Rectangle"
            onClick={() => setTool("rect")}
          >
            ⬜ Rect
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool ${tool === "circle" ? "active bg-primary text-white" : "text-muted"}`}
            title="Circle"
            onClick={() => setTool("circle")}
          >
            ⭕ Circle
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool ${tool === "eraser" ? "active bg-primary text-white" : "text-muted"}`}
            title="Eraser"
            onClick={() => setTool("eraser")}
          >
            🧼 Eraser
          </button>
        </div>

        {/* Separator */}
        <div className="toolbar-divider"></div>

        {/* Grid Background Toggles */}
        <div className="d-flex align-items-center gap-1.5 bg-black-20 rounded-8 p-1">
          <button
            type="button"
            className={`btn-toolbar-tool py-1 px-2 text-xxs ${gridType === "none" ? "bg-secondary text-white" : "text-muted"}`}
            onClick={() => setGridType("none")}
            title="Blank background"
          >
            Blank
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool py-1 px-2 text-xxs ${gridType === "dots" ? "bg-secondary text-white" : "text-muted"}`}
            onClick={() => setGridType("dots")}
            title="Dot grid"
          >
            Dots
          </button>
          <button
            type="button"
            className={`btn-toolbar-tool py-1 px-2 text-xxs ${gridType === "grid" ? "bg-secondary text-white" : "text-muted"}`}
            onClick={() => setGridType("grid")}
            title="Line grid"
          >
            Grid
          </button>
        </div>

        {/* Separator */}
        <div className="toolbar-divider"></div>

        {/* Color Palette (Disabled in eraser mode) */}
        <div className="d-flex align-items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`color-preset-dot ${color === c.value && tool !== "eraser" ? "selected" : ""}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
              disabled={tool === "eraser"}
              onClick={() => {
                setColor(c.value);
                if (tool === "eraser") setTool("brush");
              }}
              aria-label={`Color preset ${c.name}`}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="toolbar-divider"></div>

        {/* Brush size settings */}
        <div className="d-flex align-items-center gap-2">
          <span className="text-xxs uppercase tracking-wider text-muted font-bold">Size:</span>
          <input
            type="range"
            min="2"
            max="30"
            className="brush-size-slider"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value, 10))}
          />
          <div className="brush-size-preview-container d-flex align-items-center justify-content-center">
            <div
              className="brush-size-preview-circle"
              style={{
                width: `${Math.max(4, lineWidth)}px`,
                height: `${Math.max(4, lineWidth)}px`,
                backgroundColor: tool === "eraser" ? "#71717a" : color
              }}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="toolbar-divider"></div>

        {/* Actions */}
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary py-1.5 px-3 text-xxs font-bold"
            title="Undo last stroke"
            onClick={handleUndo}
          >
            ↩️ Undo
          </button>
          <button
            type="button"
            className="btn btn-secondary py-1.5 px-3 text-xxs font-bold"
            title="Export canvas as PNG"
            onClick={handleExportPNG}
          >
            💾 Export PNG
          </button>
          <button
            type="button"
            className="btn btn-primary py-1.5 px-3 text-xxs font-bold"
            title="Analyze drawing with AI"
            onClick={handleAnalyzeDrawing}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "🤖 Thinking..." : "✨ Analyze (AI)"}
          </button>
          <button
            type="button"
            className="btn btn-danger py-1.5 px-3 text-xxs font-bold"
            title="Clear all strokes"
            onClick={handleClearWhiteboard}
          >
            🧹 Clear
          </button>
        </div>

        {/* Live sync stats */}
        <div className="d-flex align-items-center gap-1.5 ms-auto">
          <span className="live-pill-indicator animate-pulse"></span>
          <span className="text-xxs uppercase tracking-wider text-muted font-bold">Synced</span>
        </div>
      </div>

      {/* HTML5 drawing canvas */}
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas flex-grow-1"
        onMouseDown={handleStartDrawing}
        onMouseMove={handleDrawingMove}
        onMouseUp={handleStopDrawing}
        onMouseLeave={handleStopDrawing}
        onTouchStart={handleStartDrawing}
        onTouchMove={handleDrawingMove}
        onTouchEnd={handleStopDrawing}
      />

      {/* AI Analysis Modal Overlay */}
      {aiAnalysis && (
        <div className="ai-analysis-modal-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-index-20" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="glass-card bg-white p-4 max-w-600 w-100 position-relative shadow-lg rounded-12" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <button 
              className="btn btn-close position-absolute top-0 end-0 m-3"
              onClick={() => setAiAnalysis("")}
            >✕</button>
            <h3 className="text-lg font-display text-primary mb-3 d-flex align-items-center gap-2">
              ✨ AI Analysis
            </h3>
            <p className="text-sm text-slate-700" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {aiAnalysis}
            </p>
            <div className="d-flex justify-content-end mt-4 border-top pt-3">
              <TextToSpeechButton text={aiAnalysis} className="btn btn-secondary px-3 py-1.5 text-xs font-bold" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
