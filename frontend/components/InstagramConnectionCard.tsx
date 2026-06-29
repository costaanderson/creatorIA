import { useCallback, useEffect, useState } from 'react';
import { ApiError, disconnectInstagram, getInstagramStatus, InstagramStatus } from '../lib/api';
import styles from '../styles/InstagramConnectionCard.module.css';

export default function InstagramConnectionCard() {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstagramStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar status do Instagram.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Instagram?')) return;
    setDisconnecting(true);
    try {
      await disconnectInstagram();
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
        Verificando conexão…
      </div>
    );
  }

  if (error) {
    return <p className={styles.errorText}>⚠️ {error}</p>;
  }

  if (!status?.connected) {
    return (
      <div className={styles.notConnected}>
        <div className={styles.notConnectedText}>
          <p className={styles.notConnectedTitle}>Nenhuma conta conectada</p>
          <p className={styles.notConnectedHint}>
            Conecte seu perfil profissional do Instagram para publicar diretamente pelo CreatorAI.
          </p>
        </div>
        <a href="http://localhost:8000/auth/instagram/connect" className={styles.connectBtn}>
          Conectar Instagram
        </a>
      </div>
    );
  }

  const expiresAt = status.token_expires_at
    ? new Date(status.token_expires_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className={styles.inner}>
      <div className={styles.avatar}>📸</div>
      <div className={styles.info}>
        <p className={styles.handle}>@{status.instagram_handle ?? 'conta conectada'}</p>
        <p className={styles.meta}>
          <span className={`${styles.statusDot} ${styles.statusDotActive}`} />
          Conectado
          {expiresAt && ` · token válido até ${expiresAt}`}
        </p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.disconnectBtn}
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? 'Desconectando…' : 'Desconectar'}
        </button>
      </div>
    </div>
  );
}
