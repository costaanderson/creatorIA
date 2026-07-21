import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, ContentProjectResponse, deleteContent, listContent, unpublishContent, updateContent } from '../lib/api';
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
    case 'archived':   return { text: 'Arquivado',   color: '#9ca3af' };
    default:           return { text: status,         color: '#6b7280' };
  }
}

function typeLabel(p: ContentProjectResponse): string {
  if (p.type === 'carousel') return `📑 Carrossel · ${p.slides_count} slides`;
  if (p.type === 'reel') return `🎬 Reel · ${p.slides_count} cenas`;
  return '🖼️ Post único';
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    if (!confirm('Arquivar este projeto?\n\nEle sairá da lista principal. Se estava publicado, o post no Instagram precisa ser removido manualmente.')) return;
    setArchivingId(projectId);
    setActionError(null);
    try {
      await unpublishContent(projectId);
      setListState((prev) =>
        prev.status === 'ready'
          ? {
              ...prev,
              projects: prev.projects.map((p) =>
                p.id === projectId
                  ? { ...p, status: 'archived', instagram_media_id: undefined, instagram_post_url: undefined }
                  : p
              ),
            }
          : prev
      );
      setArchiveNotice(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao arquivar o projeto.');
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestore = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setRestoringId(projectId);
    setActionError(null);
    try {
      await updateContent(projectId, { status: 'draft' });
      setListState((prev) =>
        prev.status === 'ready'
          ? {
              ...prev,
              projects: prev.projects.map((p) =>
                p.id === projectId ? { ...p, status: 'draft' } : p
              ),
            }
          : prev
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao restaurar o projeto.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, theme: string) => {
    e.preventDefault();
    if (!confirm(`Excluir o projeto "${theme}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(projectId);
    setActionError(null);
    try {
      await deleteContent(projectId);
      setListState((prev) =>
        prev.status === 'ready'
          ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId) }
          : prev
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao excluir o projeto.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeProjects =
    listState.status === 'ready' ? listState.projects.filter((p) => p.status !== 'archived') : [];
  const archivedProjects =
    listState.status === 'ready' ? listState.projects.filter((p) => p.status === 'archived') : [];

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

        {/* Error / notice banners */}
        {actionError && (
          <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} />
        )}
        {archiveNotice && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 10,
              fontSize: '0.875rem',
              color: '#92400e',
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span style={{ flex: 1 }}>
              Projeto arquivado. Se havia um post no Instagram, remova-o manualmente pelo app ou pelo Meta Business Suite.
            </span>
            <button
              onClick={() => setArchiveNotice(false)}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Projetos ativos ── */}
        <ProjectList
          title="Projetos recentes"
          projects={activeProjects}
          listStatus={listState.status}
          listMessage={listState.status === 'error' ? listState.message : ''}
          onRefresh={load}
          deletingId={deletingId}
          archivingId={archivingId}
          restoringId={restoringId}
          onArchive={handleArchive}
          onRestore={null}
          onDelete={handleDelete}
          emptyIcon="📭"
          emptyText="Nenhum projeto criado ainda."
          emptyLink={{ href: '/create', label: 'Criar primeiro post →' }}
        />

        {/* ── Arquivados ── */}
        {listState.status === 'ready' && archivedProjects.length > 0 && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setShowArchived((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: showArchived ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 700, color: '#6b7280', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🗂 Arquivados
                <span style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.125rem 0.5rem',
                  borderRadius: 99,
                }}>
                  {archivedProjects.length}
                </span>
              </span>
              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                {showArchived ? '▲ Ocultar' : '▼ Mostrar'}
              </span>
            </button>

            {showArchived && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {archivedProjects.map((p, i) => {
                  const isDeleting = deletingId === p.id;
                  const isRestoring = restoringId === p.id;
                  const isBusy = isDeleting || isRestoring;
                  return (
                    <li
                      key={p.id}
                      style={{
                        borderBottom: i < archivedProjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.75,
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
                          padding: '0.875rem 1rem 0.875rem 1.5rem',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                          background: 'transparent',
                          minWidth: 0,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.theme}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                            {typeLabel(p)} · {formatDate(p.created_at)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          Arquivado
                        </span>
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginRight: '0.75rem', flexShrink: 0 }}>
                        <button
                          onClick={(e) => handleRestore(e, p.id)}
                          disabled={isBusy}
                          title="Restaurar para Rascunho"
                          style={{
                            padding: '0.375rem 0.625rem',
                            background: 'none',
                            border: '1px solid #e5e7eb',
                            borderRadius: 7,
                            color: isBusy ? '#d1d5db' : '#6b7280',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            transition: 'color 0.12s, border-color 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isBusy) {
                              (e.currentTarget as HTMLButtonElement).style.color = '#4f46e5';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#a5b4fc';
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                          }}
                        >
                          {isRestoring ? '…' : '↑ Restaurar'}
                        </button>
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
        )}
      </main>
    </div>
  );
}

// ── Sub-componente: lista de projetos ─────────────────────────────────────────

interface ProjectListProps {
  title: string;
  projects: ContentProjectResponse[];
  listStatus: 'loading' | 'error' | 'ready';
  listMessage: string;
  onRefresh: () => void;
  deletingId: string | null;
  archivingId: string | null;
  restoringId: string | null;
  onArchive: ((e: React.MouseEvent, id: string) => void) | null;
  onRestore: ((e: React.MouseEvent, id: string) => void) | null;
  onDelete: (e: React.MouseEvent, id: string, theme: string) => void;
  emptyIcon: string;
  emptyText: string;
  emptyLink?: { href: string; label: string };
}

function ProjectList({
  title,
  projects,
  listStatus,
  listMessage,
  onRefresh,
  deletingId,
  archivingId,
  restoringId,
  onArchive,
  onDelete,
  emptyIcon,
  emptyText,
  emptyLink,
}: ProjectListProps) {
  return (
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
        <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>{title}</span>
        {listStatus === 'ready' && (
          <button
            onClick={onRefresh}
            style={{ fontSize: '0.8125rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ↻ Atualizar
          </button>
        )}
      </div>

      {listStatus === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.9375rem' }}>
          Carregando…
        </div>
      )}

      {listStatus === 'error' && (
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <ErrorMessage message={listMessage} onRetry={onRefresh} />
        </div>
      )}

      {listStatus === 'ready' && projects.length === 0 && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>{emptyIcon}</span>
          <p style={{ fontSize: '0.9375rem', margin: 0 }}>{emptyText}</p>
          {emptyLink && (
            <Link href={emptyLink.href} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}>
              {emptyLink.label}
            </Link>
          )}
        </div>
      )}

      {listStatus === 'ready' && projects.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {projects.map((p, i) => {
            const { text, color } = statusLabel(p.status);
            const isDeleting = deletingId === p.id;
            const isArchiving = archivingId === p.id;
            const isRestoring = restoringId === p.id;
            const isBusy = isDeleting || isArchiving || isRestoring;
            return (
              <li
                key={p.id}
                style={{
                  borderBottom: i < projects.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.theme}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                      {typeLabel(p)} · {formatDate(p.created_at)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {text}
                  </span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginRight: '0.75rem', flexShrink: 0 }}>
                  {onArchive && p.status === 'published' && (
                    <button
                      onClick={(e) => onArchive(e, p.id)}
                      disabled={isBusy}
                      title="Arquivar projeto"
                      style={{
                        padding: '0.375rem 0.625rem',
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: 7,
                        color: isBusy ? '#d1d5db' : '#6b7280',
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        transition: 'color 0.12s, border-color 0.12s',
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
                      {isArchiving ? '…' : '↩ Arquivar'}
                    </button>
                  )}
                  <button
                    onClick={(e) => onDelete(e, p.id, p.theme)}
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
  );
}
