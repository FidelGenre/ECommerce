// client/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { fetchJSON } from "../lib/http"; // ← usamos SIEMPRE el mismo fetch

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user } = await fetchJSON("/auth/me");
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { user } = await fetchJSON("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    const { user } = await fetchJSON("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    setUser(user);
    return user;
  };

  const logout = async () => {
    await fetchJSON("/auth/logout", { method: "POST" });
    setUser(null);
    return true;
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
