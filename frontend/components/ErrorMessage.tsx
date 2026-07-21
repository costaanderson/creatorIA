interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Exibe mensagens de erro de forma padronizada.
 * Use onRetry para ações recuperáveis (ex: recarregar lista).
 * Use onDismiss para fechar o banner sem ação adicional.
 */
export default function ErrorMessage({ message, onRetry, onDismiss }: Props) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 10,
        color: '#991b1b',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: '1rem' }}>⚠️</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            flexShrink: 0,
            padding: '0.25rem 0.625rem',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            background: '#fff',
            color: '#b91c1c',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Tentar novamente
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            color: '#b91c1c',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            padding: '0 0.125rem',
          }}
          title="Fechar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
