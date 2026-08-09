import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

type Mode = 'login' | 'signup';
type AuthState = 'idle' | 'loading' | 'success' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthState('loading');
    setErrorMsg('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthState('success');
        return;
      }
      router.replace('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
      setErrorMsg(message);
      setAuthState('error');
    }
  };

  const isLoading = authState === 'loading';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>CreatorAI</h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.375rem 0 0' }}>
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Confirmation banner (after signup) */}
        {authState === 'success' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', color: '#15803d', fontSize: '0.875rem', textAlign: 'center' }}>
            Conta criada! Verifique seu e-mail para confirmar o cadastro.
          </div>
        )}

        {/* Error banner */}
        {authState === 'error' && errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              disabled={isLoading}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: '0.9375rem', color: '#111827', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: '0.9375rem', color: '#111827', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ marginTop: '0.5rem', padding: '0.875rem', background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}
          >
            {isLoading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* Mode toggle */}
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', marginTop: '1.5rem', marginBottom: 0 }}>
          {mode === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthState('idle'); setErrorMsg(''); }}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
          >
            {mode === 'login' ? 'Criar conta' : 'Fazer login'}
          </button>
        </p>
      </div>
    </div>
  );
}
