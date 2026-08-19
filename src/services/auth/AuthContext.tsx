import type { User as SharedUser } from '@stockmok/shared';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { AuthUser } from '@/data/adapters/authAdapter';
import { fetchUserSelfDoc, logoutUser, subscribeToAuthState } from '@/data/adapters/authAdapter';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly userSelfDoc: SharedUser | null;
  readonly isLoading: boolean;
  readonly signOutUser: () => Promise<void>;
  readonly refreshUserSelfDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userSelfDoc, setUserSelfDoc] = useState<SharedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserSelfDoc = async (uid: string) => {
    try {
      const docData = await fetchUserSelfDoc(uid);
      setUserSelfDoc(docData);
    } catch {
      setUserSelfDoc(null);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser);
      if (authUser) {
        void loadUserSelfDoc(authUser.uid).finally(() => {
          setIsLoading(false);
        });
      } else {
        setUserSelfDoc(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOutUser = async () => {
    await logoutUser();
    setUser(null);
    setUserSelfDoc(null);
  };

  const refreshUserSelfDoc = async () => {
    if (user) {
      await loadUserSelfDoc(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userSelfDoc,
        isLoading,
        signOutUser,
        refreshUserSelfDoc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
