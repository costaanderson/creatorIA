import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ApiError, ContentGenerateRequest, ContentProjectResponse, generateContent, getContent } from '../lib/api';
import ContentGeneratorForm from '../components/ContentGeneratorForm';
import ContentPreview from '../components/ContentPreview';
import styles from '../styles/create.module.css';

type PageState =
  | { phase: 'form' }
  | { phase: 'loading_project' }
  | { phase: 'generating' }
  | { phase: 'preview'; project: ContentProjectResponse; imageUrls: string[] }
  | { phase: 'error'; message: string };

export default function CreatePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ phase: 'form' });

  // Adjust 3 — load existing project from query param ?id=
  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.id;
    if (typeof id !== 'string' || !id) return;

    setState({ phase: 'loading_project' });
    getContent(id)
      .then((project) => setState({ phase: 'preview', project, imageUrls: [] }))
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : 'Projeto não encontrado.';
        setState({ phase: 'error', message });
      });
  }, [router.isReady, router.query.id]);

  const handleGenerate = async (request: ContentGenerateRequest) => {
    const capturedImageUrls = request.image_urls ?? [];
    setState({ phase: 'generating' });
    try {
      const project = await generateContent(request);
      setState({ phase: 'preview', project, imageUrls: capturedImageUrls });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Ocorreu um erro inesperado. Tente novamente.';
      setState({ phase: 'error', message });
    }
  };

  const handleNewContent = () => {
    // Remove query param when going back to form
    router.replace('/create', undefined, { shallow: true });
    setState({ phase: 'form' });
  };

  const isGenerating = state.phase === 'generating';

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.backLink}>
          ← Início
        </Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span className={styles.topbarTitle}>Criar conteúdo</span>
      </header>

      <main className={styles.container}>
        {/* Loading existing project */}
        {state.phase === 'loading_project' && (
          <div className={styles.card}>
            <div className={styles.cardBody} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              Carregando projeto…
            </div>
          </div>
        )}

        {/* Formulário — visível nas fases form / generating / error */}
        {(state.phase === 'form' || state.phase === 'generating' || state.phase === 'error') && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Novo conteúdo</h2>
              <p className={styles.cardSubtitle}>
                Descreva o tema e a IA irá gerar o conteúdo respeitando seu Brand Kit.
              </p>
            </div>
            <div className={styles.cardBody}>
              <ContentGeneratorForm onGenerate={handleGenerate} loading={isGenerating} />

              {state.phase === 'error' && (
                <div className={styles.errorBanner}>
                  <span>⚠️</span>
                  <p>{state.message}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Preview */}
        {state.phase === 'preview' && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Conteúdo gerado</h2>
              <p className={styles.cardSubtitle}>
                Revise os slides, a legenda e as hashtags antes de publicar.
              </p>
            </div>
            <div className={styles.cardBody}>
              <ContentPreview
                project={state.project}
                onNewContent={handleNewContent}
                onUpdated={(updated) =>
                  setState({ phase: 'preview', project: updated, imageUrls: state.imageUrls })
                }
                presetImageUrls={state.imageUrls.length > 0 ? state.imageUrls : undefined}
              />
            </div>
          </section>
        )}

        {/* Gerando — overlay de loading */}
        {isGenerating && (
          <div className={styles.generatingCard}>
            <span className={styles.spinner} />
            <p className={styles.generatingTitle}>Gerando com IA…</p>
            <p className={styles.generatingSubtitle}>
              O modelo está criando seu conteúdo com base no Brand Kit. Isso pode levar alguns segundos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
