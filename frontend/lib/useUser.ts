import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

/**
 * Hook de proteção de rota.
 * Retorna a sessão ativa ou null enquanto redireciona para /login.
 * Use em todas as páginas que exigem autenticação.
 */
export function useUser(): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.replace('/login');
      } else {
        setSession(newSession);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return session;
}
