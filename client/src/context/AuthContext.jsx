import { createContext, useContext, useState } from 'react';
import { authApi, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialise from localStorage so a page refresh keeps the session.
  const [user, setUser] = useState(() => tokenStore.user);

  async function login(email, password) {
    const data = await authApi.login(email, password);
    tokenStore.save(data);
    setUser(data.user || { email });
    return data;
  }

  // One-click demo sign-in (password handled server-side).
  async function demoLogin(email) {
    const data = await authApi.demoLogin(email);
    tokenStore.save(data);
    setUser(data.user || { email: email || 'demo1@ivy.homes' });
    return data;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // logout is stateless upstream; clearing locally is what matters
    }
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthed: !!tokenStore.access, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
