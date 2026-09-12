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
    <AuthContext.Provider value={{ user, isAuthed: !!tokenStore.access, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
