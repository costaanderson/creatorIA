import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, BrandKit, getBrandKit } from '../lib/api';
import BrandKitForm from '../components/BrandKitForm';
import InstagramConnectionCard from '../components/InstagramConnectionCard';
import styles from '../styles/settings.module.css';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; brandKit: BrandKit | null };

export default function SettingsPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  const loadBrandKit = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const kit = await getBrandKit();
      setState({ status: 'ready', brandKit: kit });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as configurações. Verifique se o backend está rodando.';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => { loadBrandKit(); }, [loadBrandKit]);

  const handleBrandKitSaved = (kit: BrandKit) => {
    setState({ status: 'ready', brandKit: kit });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.backLink}>
          ← Início
        </Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span className={styles.topbarTitle}>Configurações</span>
      </header>

      {/* Content */}
      <main className={styles.container}>
        {/* Instagram connection */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Conta do Instagram</h2>
            <p className={styles.cardSubtitle}>
              Conecte seu perfil profissional para publicar diretamente pelo CreatorAI.
            </p>
          </div>
          <div className={styles.cardBody}>
            <InstagramConnectionCard />
          </div>
        </section>

        {/* Brand Kit */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Brand Kit</h2>
            <p className={styles.cardSubtitle}>
              Defina a identidade visual da sua marca. A IA usará essas informações em toda geração de
              conteúdo.
            </p>
          </div>
          <div className={styles.cardBody}>
            {state.status === 'loading' && (
              <div className={styles.loadingPage}>
                <span className={styles.spinner} />
                <p className={styles.loadingText}>Carregando Brand Kit…</p>
              </div>
            )}

            {state.status === 'error' && (
              <div className={styles.pageError}>
                <p className={styles.pageErrorTitle}>⚠️ Não foi possível carregar</p>
                <p className={styles.pageErrorText}>{state.message}</p>
                <button className={styles.retryBtn} onClick={loadBrandKit}>
                  Tentar novamente
                </button>
              </div>
            )}

            {state.status === 'ready' && (
              <BrandKitForm
                initialData={state.brandKit}
                onSaved={handleBrandKitSaved}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
