import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Lazy load pages for code splitting and optimized initial load time
const HomePage = React.lazy(() => import("../pages/HomePage"));
const LoginPage = React.lazy(() => import("../pages/LoginPage"));
const RegisterPage = React.lazy(() => import("../pages/RegisterPage"));
const DashboardPage = React.lazy(() => import("../pages/DashboardPage"));
const WorkspacePage = React.lazy(() => import("../pages/WorkspacePage"));

const LoadingScreen = () => (
  <div style={loadingStyles.container}>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <div style={loadingStyles.spinner}></div>
  </div>
);

const loadingStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "#0f172a",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(56, 189, 248, 0.15)",
    borderTop: "4px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  }
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
