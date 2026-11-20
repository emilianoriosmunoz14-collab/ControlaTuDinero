
import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { CONFIG } from '../config.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if there is a session active when the component is mounted
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await apiFetch(CONFIG.ENDPOINTS.me);

        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // login
  async function login(email, password) {
    const response = await apiFetch(CONFIG.ENDPOINTS.login, {
      method: 'POST',
      body: { email, password },
    });

    setUser(response.user);
    return response.user;
  }

  // logout
  async function logout() {
    try {
      await apiFetch(CONFIG.ENDPOINTS.logout, {
        method: 'POST',
      });
    } finally {
      setUser(null);
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Allow components to access the auth context
export function useAuth() {
  return useContext(AuthContext);
}
