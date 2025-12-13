import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  credits: number;
  bgRemovalCredits: number;
}

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  updateCredits: (newCredits: number) => void;
  updateBgCredits: (newBgCredits: number) => void;
}

export function useUser(): UseUserReturn {
  const { data: session, isPending } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      setUser(null);
      setError(null);
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        role: (session.user as any).role || 'USER',
        credits: (session.user as any).credits || 0,
        bgRemovalCredits: (session.user as any).bgRemovalCredits || 0,
      });
      setError(null);
    }
  }, [session, isPending]);

  const updateCredits = (newCredits: number) => {
    if (user) {
      setUser({
        ...user,
        credits: newCredits
      });
    }
  };

  const updateBgCredits = (newBgCredits: number) => {
    if (user) {
      setUser({
        ...user,
        bgRemovalCredits: newBgCredits
      });
    }
  };

  return {
    user,
    loading: isPending,
    error,
    updateCredits,
    updateBgCredits,
  };
}