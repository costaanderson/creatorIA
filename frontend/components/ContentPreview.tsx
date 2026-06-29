import { useState } from 'react';
import {
  ContentProjectResponse,
  ContentUpdateRequest,
  publishContent,
  updateContent,
  ApiError,
} from '../lib/api';
import InstagramPreview from './InstagramPreview';
import styles from '../styles/ContentPreview.module.css';

interface Props {
  project: ContentProjectResponse;
  onNewContent: () => void;
  onUpdated?: (project: ContentProjectResponse) => void;
  /** Image URLs collected from the generator form — pre-fills the publish flow. */
  presetImageUrls?: string[];
}

type ActiveTab = 'preview' | 'edit';

type PublishState =
  | { status: 'idle' }
  | { status: 'awaiting_url' }
  | { status: 'publishing' }
  | { status: 'success'; postUrl?: string }
  | { status: 'error'; message: string };

interface EditState {
  caption: string;
  hashtags: string; // one per line
  slides: Array<{ id: string; title: string; body: string; visual_prompt: string }>;
}

function initEditState(project: ContentProjectResponse): EditState {
  return {
    caption: project.caption ?? '',
    hashtags: project.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join('\n'),
    slides: project.slides.map((s) => ({
      id: s.id,
      title: s.title ?? '',
      body: s.body ?? '',
      visual_prompt: s.visual_prompt ?? '',
    })),
  };
}

export default function ContentPreview({ project, onNewContent, onUpdated, presetImageUrls }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [activeSlide, setActiveSlide] = useState(0);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
  const [imageUrlsInput, setImageUrlsInput] = useState('');
  const [showInstagramPreview, setShowInstagramPreview] = useState(false);

  const [editState, setEditState] = useState<EditState>(() => initEditState(project));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const slide = project.slides[activeSlide];
  const isCarousel = project.type === 'carousel';
  const alreadyPublished = project.status === 'published';

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  const hashtagsText = project.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');

  const handlePublishClick = () => {
    if (publishState.status === 'idle' || publishState.status === 'error') {
      // Pre-fill with URLs from the generator form if available
      const prefilled =
        presetImageUrls && presetImageUrls.filter((u) => u.startsWith('http')).length > 0
          ? presetImageUrls.filter((u) => u.startsWith('http')).join('\n')
          : '';
      setImageUrlsInput(prefilled);
      setPublishState({ status: 'awaiting_url' });
    }
  };

  const handleConfirmPublish = async () => {
    const urls = imageUrlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    const required = isCarousel ? project.slides_count : 1;
    if (urls.length < required) {
      setPublishState({
        status: 'error',
        message: `Informe ${required} URL${required > 1 ? 's' : ''} de imagem (uma por linha).`,
      });
      return;
    }

    setPublishState({ status: 'publishing' });
    try {
      const result = await publishContent(project.id, urls);
      setPublishState({ status: 'success', postUrl: result.instagram_post_url });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao publicar. Tente novamente.';
      setPublishState({ status: 'error', message: msg });
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'edit') {
      // Re-initialize edit state from current project when entering edit tab
      setEditState(initEditState(project));
      setSaveError(null);
    }
    setActiveTab(tab);
  };

  const handleSlideFieldChange = (
    index: number,
    field: 'title' | 'body' | 'visual_prompt',
    value: string,
  ) => {
    setEditState((prev) => {
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], [field]: value };
      return { ...prev, slides };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const parsedHashtags = editState.hashtags
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);

    const payload: ContentUpdateRequest = {
      caption: editState.caption,
      hashtags: parsedHashtags,
      slides: editState.slides.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.body,
        visual_prompt: s.visual_prompt,
      })),
    };

    try {
      const updated = await updateContent(project.id, payload);
      onUpdated?.(updated);
      setActiveTab('preview');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao salvar. Tente novamente.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.badge}>
            {isCarousel ? `📑 Carrossel · ${project.slides_count} slides` : '🖼️ Post único'}
          </span>
          <span className={styles.theme}>{project.theme}</span>
        </div>
        <button className={styles.newBtn} onClick={onNewContent}>
          + Novo conteúdo
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('preview')}
        >
          👁 Preview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'edit' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('edit')}
        >
          ✏️ Editar
        </button>
      </div>

      {/* ── PREVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <>
          {/* Slide tabs */}
          {isCarousel && (
            <div className={styles.slideTabs}>
              {project.slides.map((s, i) => (
                <button
                  key={s.id}
                  className={`${styles.slideTab} ${i === activeSlide ? styles.slideTabActive : ''}`}
                  onClick={() => setActiveSlide(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {slide && (
            <div className={styles.slideCard}>
              <div className={styles.slideHeader}>
                <span className={styles.slideNumber}>
                  {isCarousel ? `Slide ${slide.slide_order}` : 'Conteúdo'}
                </span>
              </div>

              {slide.title && <h3 className={styles.slideTitle}>{slide.title}</h3>}
              {slide.body && <p className={styles.slideBody}>{slide.body}</p>}

              {slide.visual_prompt && (
                <div className={styles.visualPromptBox}>
                  <span className={styles.visualPromptLabel}>🎨 Prompt visual</span>
                  <p className={styles.visualPromptText}>{slide.visual_prompt}</p>
                </div>
              )}
            </div>
          )}

          {/* Legenda */}
          {project.caption && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Legenda</span>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyToClipboard(project.caption!, setCaptionCopied)}
                >
                  {captionCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p className={styles.captionText}>{project.caption}</p>
              <span className={styles.charCount}>{project.caption.length}/2.200 chars</span>
            </div>
          )}

          {/* Hashtags */}
          {project.hashtags.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Hashtags · {project.hashtags.length}</span>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyToClipboard(hashtagsText, setHashtagsCopied)}
                >
                  {hashtagsCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div className={styles.hashtagGrid}>
                {project.hashtags.map((tag, i) => (
                  <span key={i} className={styles.hashtag}>
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pré-visualização Instagram */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Pré-visualização Instagram</span>
              <button
                className={styles.copyBtn}
                onClick={() => setShowInstagramPreview((v) => !v)}
              >
                {showInstagramPreview ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showInstagramPreview && (
              <div style={{ padding: '1rem' }}>
                <InstagramPreview
                  imageUrl={presetImageUrls?.[0]}
                  caption={project.caption}
                  isCarousel={isCarousel}
                  slidesCount={project.slides_count}
                />
              </div>
            )}
          </div>

          {/* Publicação */}
          <div className={styles.publishSection}>
            {alreadyPublished && project.instagram_post_url ? (
              <div className={styles.publishSuccess}>
                <span>✅ Publicado no Instagram!</span>
                <a href={project.instagram_post_url} target="_blank" rel="noopener noreferrer" className={styles.postLink}>
                  Ver post →
                </a>
              </div>
            ) : publishState.status === 'success' ? (
              <div className={styles.publishSuccess}>
                <span>✅ Publicado com sucesso!</span>
                {publishState.postUrl && (
                  <a href={publishState.postUrl} target="_blank" rel="noopener noreferrer" className={styles.postLink}>
                    Ver post →
                  </a>
                )}
              </div>
            ) : publishState.status === 'publishing' ? (
              <div className={styles.publishingRow}>
                <div className={styles.publishSpinner} />
                <span className={styles.publishingText}>Publicando no Instagram…</span>
              </div>
            ) : publishState.status === 'awaiting_url' || publishState.status === 'error' ? (
              <div className={styles.urlInputArea}>
                <p className={styles.urlInputLabel}>
                  Cole {isCarousel ? `${project.slides_count} URLs de imagem (uma por linha)` : 'a URL pública da imagem'}:
                </p>
                <textarea
                  className={styles.urlTextarea}
                  rows={isCarousel ? project.slides_count : 2}
                  placeholder={isCarousel ? 'https://... (slide 1)\nhttps://... (slide 2)' : 'https://...'}
                  value={imageUrlsInput}
                  onChange={(e) => setImageUrlsInput(e.target.value)}
                />
                {publishState.status === 'error' && (
                  <p className={styles.publishError}>{publishState.message}</p>
                )}
                <div className={styles.urlButtons}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setPublishState({ status: 'idle' })}
                  >
                    Cancelar
                  </button>
                  <button className={styles.publishBtn} onClick={handleConfirmPublish}>
                    Publicar agora
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.publishBtn} onClick={handlePublishClick}>
                📤 Publicar no Instagram
              </button>
            )}
          </div>
        </>
      )}

      {/* ── EDIT TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'edit' && (
        <div className={styles.editForm}>
          {/* Slides */}
          {editState.slides.map((s, i) => (
            <div key={s.id} className={styles.slideEditCard}>
              <div className={styles.slideNumber}>
                {isCarousel ? `Slide ${i + 1}` : 'Conteúdo'}
              </div>

              <div className={styles.editField}>
                <label className={styles.editLabel}>Título</label>
                <textarea
                  className={styles.editTextarea}
                  rows={2}
                  value={s.title}
                  onChange={(e) => handleSlideFieldChange(i, 'title', e.target.value)}
                />
              </div>

              <div className={styles.editField}>
                <label className={styles.editLabel}>Corpo</label>
                <textarea
                  className={styles.editTextarea}
                  rows={4}
                  value={s.body}
                  onChange={(e) => handleSlideFieldChange(i, 'body', e.target.value)}
                />
              </div>

              <div className={styles.editField}>
                <label className={styles.editLabel}>Prompt visual</label>
                <textarea
                  className={styles.editTextarea}
                  rows={3}
                  value={s.visual_prompt}
                  onChange={(e) => handleSlideFieldChange(i, 'visual_prompt', e.target.value)}
                />
                <span className={styles.editHint}>Descreva a imagem ideal para este slide.</span>
              </div>
            </div>
          ))}

          {/* Legenda */}
          <div className={styles.editField}>
            <label className={styles.editLabel}>Legenda</label>
            <textarea
              className={styles.editTextarea}
              rows={6}
              value={editState.caption}
              onChange={(e) => setEditState((prev) => ({ ...prev, caption: e.target.value }))}
              maxLength={2200}
            />
            <span className={styles.editHint}>{editState.caption.length}/2.200 chars</span>
          </div>

          {/* Hashtags */}
          <div className={styles.editField}>
            <label className={styles.editLabel}>Hashtags (uma por linha)</label>
            <textarea
              className={styles.editTextarea}
              rows={8}
              value={editState.hashtags}
              onChange={(e) => setEditState((prev) => ({ ...prev, hashtags: e.target.value }))}
              placeholder={'#design\n#branding\n#identidadevisual'}
            />
            <span className={styles.editHint}>
              {editState.hashtags.split('\n').filter(Boolean).length} hashtags
            </span>
          </div>

          {saveError && <p className={styles.saveError}>{saveError}</p>}

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className={styles.publishSpinner} style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} />
                Salvando…
              </span>
            ) : (
              '💾 Salvar alterações'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
