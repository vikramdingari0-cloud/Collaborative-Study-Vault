import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { getApiErrorMessage } from "../utils/apiErrors";

const AuthContext = createContext(null);

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (token expires in 15m)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshProfile = useCallback(async () => {
    const response = await axiosInstance.get("/auth/profile");
    if (response.data?.success) {
      setUser(response.data.data);
      return response.data.data;
    }
    return null;
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshProfile();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [refreshProfile]);

  useEffect(() => {
    if (!user) return undefined;

    const refreshToken = async () => {
      try {
        await axiosInstance.post("/auth/refresh");
        await refreshProfile();
      } catch {
        setUser(null);
      }
    };

    const interval = setInterval(refreshToken, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refreshProfile]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth/login", { email, password });
      if (response.data?.success) {
        setUser(response.data.data);
        return response.data.data;
      }
      throw new Error("Login failed");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Login failed. Check your email and password.");
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth/register", { name, email, password });
      if (response.data?.success) {
        setUser(response.data.data);
        return response.data.data;
      }
      throw new Error("Registration failed");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Registration failed. Try another email.");
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const guestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth/guest");
      if (response.data?.success) {
        setUser(response.data.data);
        return response.data.data;
      }
      throw new Error("Guest login failed");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Guest login failed.");
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await axiosInstance.post("/auth/logout");
    } catch {
      // Clear client state even if request fails
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        guestLogin,
        logout,
        setError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
