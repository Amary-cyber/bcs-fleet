import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const DEFAULT_ADMIN: UserProfile = {
  id: 'usr-admin-01',
  email: 'admin@bcsfleet.sn',
  full_name: 'Amadou Sow (Directeur Flotte)',
  phone: '+221 77 888 99 00',
  role: 'ADMIN',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_ADMIN);
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      setIsLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // Fetch profile from supabase
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                const profile: UserProfile = {
                  id: data.id,
                  email: data.email,
                  full_name: data.full_name,
                  phone: data.phone,
                  role: data.role as UserRole,
                  avatar_url: data.avatar_url,
                };
                setUser(profile);
                setRole(profile.role);
              }
              setIsLoading(false);
            });
        } else {
          setIsLoading(false);
        }
      });
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error || !data.user) {
        setIsLoading(false);
        return false;
      }
    }
    // Fallback to Demo Authentication
    const demoRole: UserRole = email.includes('manager')
      ? 'MANAGER'
      : email.includes('driver')
      ? 'DRIVER'
      : email.includes('viewer')
      ? 'VIEWER'
      : 'ADMIN';

    const loggedUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: email.split('@')[0].toUpperCase() + ' (BCS Fleet)',
      role: demoRole,
    };
    setUser(loggedUser);
    setRole(demoRole);
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    if (isSupabaseConfigured()) {
      supabase.auth.signOut();
    }
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
