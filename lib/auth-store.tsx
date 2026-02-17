import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerUser as appwriteRegister,
  loginUser as appwriteLogin,
  logoutUser as appwriteLogout,
  getCurrentSession,
  type UserProfile,
} from '@/lib/appwrite';

const AUTH_KEY = 'auth_user';

export interface User {
  id: string;
  phone: string;
  displayName: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (phone: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem(AUTH_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
      }

      const session = await getCurrentSession();
      if (session) {
        const u: User = {
          id: session.id,
          phone: session.phone,
          displayName: session.displayName,
          isAdmin: session.isAdmin,
        };
        setUser(u);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
      } else {
        setUser(null);
        await AsyncStorage.removeItem(AUTH_KEY);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
  };

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const profile = await appwriteLogin(phone, password);
      const u: User = {
        id: profile.id,
        phone: profile.phone,
        displayName: profile.displayName,
        isAdmin: profile.isAdmin,
      };
      await saveUser(u);
      return { success: true };
    } catch (e: any) {
      const msg = e?.message || 'Numéro ou mot de passe incorrect';
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (phone: string, password: string, displayName?: string) => {
    try {
      const profile = await appwriteRegister(phone, password, displayName);
      const u: User = {
        id: profile.id,
        phone: profile.phone,
        displayName: profile.displayName,
        isAdmin: profile.isAdmin,
      };
      await saveUser(u);
      return { success: true };
    } catch (e: any) {
      const msg = e?.message || "Erreur lors de l'inscription";
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    await appwriteLogout();
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }), [user, isLoading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
