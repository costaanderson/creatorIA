import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, ContentProjectResponse, deleteContent, listContent, unpublishContent } from '../lib/api';
import ErrorMessage from '../components/ErrorMessage';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: ContentProjectResponse[] };

function statusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case 'draft':      return { text: 'Rascunho',    color: '#6b7280' };
    case 'approved':   return { text: 'Aprovado',    color: '#059669' };
    case 'publishing': return { text: 'Publicando…', color: '#d97706' };
    case 'published':  return { text: 'Publicado',   color: '#2563eb' };
    case 'failed':     return { text: 'Falhou',      color: '#dc2626' };
    default:           return { text: status,         color: '#6b7280' };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Home() {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListState({ status: 'loading' });
    try {
      const projects = await listContent();
      setListState({ status: 'ready', projects });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Não foi possível carregar os projetos.';
      setListState({ status: 'error', message });
    }
  }, []);

  const handleUnpublish = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    if (!confirm('Remover este post do Instagram? O projeto voltará para Rascunho.')) return;
    setUnpublishingId(projectId);
    setDeleteError(null);
    try {
      await unpublishContent(projectId);
      setListState((prev) =>
        prev.status === 'ready'
          ? {
              ...prev,
              projects: prev.projects.map((p) =>
                p.id === projectId
                  ? { ...p, status: 'draft', instagram_media_id: undefined, instagram_post_url: undefined }
                  : p
              ),
            }
          : prev
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao despublicar o projeto.';
      setDeleteError(message);
    } finally {
      setUnpublishingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, theme: string) => {
    e.preventDefault();
    if (!confirm(`Excluir o projeto "${theme}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(projectId);
    setDeleteError(null);
    try {
      await deleteContent(projectId);
      setListState((prev) =>
        prev.status === 'ready'
          ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId) }
          : prev
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao excluir o projeto.';
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Top bar */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 2rem',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>✨ CreatorAI</span>
        <Link
          href="/settings"
          style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}
        >
          ⚙️ Configurações
        </Link>
      </header>

      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* CTA banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 16,
            padding: '2rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 0.375rem' }}>
              Crie seu próximo post
            </h1>
            <p style={{ fontSize: '0.9375rem', opacity: 0.85, margin: 0 }}>
              IA gera slides, legenda e hashtags em segundos.
            </p>
          </div>
          <Link
            href="/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#fff',
              color: '#4f46e5',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            + Criar conteúdo
          </Link>
        </div>

        {/* Delete error banner */}
        {deleteError && (
          <ErrorMessage
            message={deleteError}
            onDismiss={() => setDeleteError(null)}
          />
        )}

        {/* Projects list */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>
              Projetos recentes
            </span>
            {listState.status === 'ready' && (
              <button
                onClick={load}
                style={{
                  fontSize: '0.8125rem',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ↻ Atualizar
              </button>
            )}
          </div>

          {listState.status === 'loading' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '3rem',
                color: '#9ca3af',
                fontSize: '0.9375rem',
              }}
            >
              Carregando…
            </div>
          )}

          {listState.status === 'error' && (
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <ErrorMessage message={listState.message} onRetry={load} />
            </div>
          )}

          {listState.status === 'ready' && listState.projects.length === 0 && (
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#9ca3af',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <p style={{ fontSize: '0.9375rem', margin: 0 }}>Nenhum projeto criado ainda.</p>
              <Link
                href="/create"
                style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}
              >
                Criar primeiro post →
              </Link>
            </div>
          )}

          {listState.status === 'ready' && listState.projects.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {listState.projects.map((p, i) => {
                const { text, color } = statusLabel(p.status);
                const typeLabel =
                  p.type === 'carousel'
                    ? `📑 Carrossel · ${p.slides_count} slides`
                    : p.type === 'reel'
                    ? `🎬 Reel · ${p.slides_count} cenas`
                    : '🖼️ Post único';
                const isDeleting = deletingId === p.id;
                const isUnpublishing = unpublishingId === p.id;
                const isBusy = isDeleting || isUnpublishing;
                return (
                  <li
                    key={p.id}
                    style={{
                      borderBottom:
                        i < listState.projects.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Link
                      href={`/create?id=${p.id}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '1rem 1rem 1rem 1.5rem',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                        background: 'transparent',
                        minWidth: 0,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.theme}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                          {typeLabel} · {formatDate(p.created_at)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {text}
                      </span>
                    </Link>

                    {/* Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginRight: '0.75rem', flexShrink: 0 }}>
                      {p.status === 'published' && (
                        <button
                          onClick={(e) => handleUnpublish(e, p.id)}
                          disabled={isBusy}
                          title="Despublicar do Instagram"
                          style={{
                            padding: '0.375rem 0.625rem',
                            background: 'none',
                            border: '1px solid #e5e7eb',
                            borderRadius: 7,
                            color: isBusy ? '#d1d5db' : '#6b7280',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            transition: 'color 0.12s, border-color 0.12s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            if (!isBusy) {
                              (e.currentTarget as HTMLButtonElement).style.color = '#d97706';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#fcd34d';
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                          }}
                        >
                          {isUnpublishing ? '…' : '↩ Despublicar'}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, p.id, p.theme)}
                        disabled={isBusy}
                        title="Excluir projeto"
                        style={{
                          padding: '0.375rem 0.5rem',
                          background: 'none',
                          border: '1px solid #e5e7eb',
                          borderRadius: 7,
                          color: isBusy ? '#d1d5db' : '#9ca3af',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          transition: 'color 0.12s, border-color 0.12s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isBusy) {
                            (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                        }}
                      >
                        {isDeleting ? '…' : '🗑'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
