import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gov-sim-token');
    setIsAuthenticated(!!token);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('gov-sim-token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('gov-sim-token');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
}

