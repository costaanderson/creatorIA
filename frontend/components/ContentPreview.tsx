import { useRef, useState } from 'react';
import {
  ContentProjectResponse,
  ContentUpdateRequest,
  generateSlideImage,
  publishContent,
  publishReel,
  updateContent,
  uploadContentVideo,
  ApiError,
} from '../lib/api';
import ErrorMessage from './ErrorMessage';
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

  // Geração de imagem por slide
  const [generatingImage, setGeneratingImage] = useState<Record<string, boolean>>({});
  const [slideImages, setSlideImages] = useState<Record<string, string>>(() =>
    Object.fromEntries(project.slides.filter((s) => s.media_url).map((s) => [s.id, s.media_url!]))
  );

  // Upload de vídeo para Reel
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoUpload, setVideoUpload] = useState<{ url: string; name: string } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState>(() => initEditState(project));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const slide = project.slides[activeSlide];
  const isCarousel = project.type === 'carousel';
  const isReel = project.type === 'reel';
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

  const handleGenerateImage = async (slideId: string) => {
    setGeneratingImage((prev) => ({ ...prev, [slideId]: true }));
    try {
      const result = await generateSlideImage(project.id, slideId);
      setSlideImages((prev) => ({ ...prev, [slideId]: result.url }));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao gerar imagem.';
      alert(msg);
    } finally {
      setGeneratingImage((prev) => ({ ...prev, [slideId]: false }));
    }
  };

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    setVideoUploadError(null);
    try {
      const result = await uploadContentVideo(file);
      setVideoUpload({ url: result.url, name: file.name });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro no upload do vídeo.';
      setVideoUploadError(msg);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePublishClick = () => {
    if (publishState.status === 'idle' || publishState.status === 'error') {
      if (!isReel) {
        const prefilled =
          presetImageUrls && presetImageUrls.filter((u) => u.startsWith('http')).length > 0
            ? presetImageUrls.filter((u) => u.startsWith('http')).join('\n')
            : Object.values(slideImages).join('\n');
        setImageUrlsInput(prefilled);
      }
      setPublishState({ status: 'awaiting_url' });
    }
  };

  const handleConfirmPublish = async () => {
    setPublishState({ status: 'publishing' });
    try {
      if (isReel) {
        if (!videoUpload?.url) {
          setPublishState({ status: 'error', message: 'Faça upload do vídeo antes de publicar.' });
          return;
        }
        const coverUrl = Object.values(slideImages)[0];
        const result = await publishReel(project.id, videoUpload.url, coverUrl);
        setPublishState({ status: 'success', postUrl: result.instagram_post_url });
      } else {
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
        const result = await publishContent(project.id, urls);
        setPublishState({ status: 'success', postUrl: result.instagram_post_url });
      }
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
            {isReel
              ? `🎬 Reel · ${project.slides_count} cenas`
              : isCarousel
              ? `📑 Carrossel · ${project.slides_count} slides`
              : '🖼️ Post único'}
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
                  {isReel ? `Cena ${slide.slide_order}` : isCarousel ? `Slide ${slide.slide_order}` : 'Conteúdo'}
                </span>
              </div>

              {slide.title && <h3 className={styles.slideTitle}>{slide.title}</h3>}
              {slide.body && <p className={styles.slideBody}>{slide.body}</p>}

              {slide.visual_prompt && (
                <div className={styles.visualPromptBox}>
                  <span className={styles.visualPromptLabel}>
                    {isReel ? '🎥 Direção de câmera' : '🎨 Prompt visual'}
                  </span>
                  <p className={styles.visualPromptText}>{slide.visual_prompt}</p>

                  {/* Imagem gerada */}
                  {slideImages[slide.id] ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slideImages[slide.id]}
                        alt={`Imagem gerada — ${slide.title}`}
                        style={{ width: '100%', borderRadius: '8px', display: 'block' }}
                      />
                    </div>
                  ) : !isReel && (
                    <button
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #6366F1',
                        background: 'transparent',
                        color: '#6366F1',
                        cursor: generatingImage[slide.id] ? 'not-allowed' : 'pointer',
                        opacity: generatingImage[slide.id] ? 0.6 : 1,
                      }}
                      onClick={() => handleGenerateImage(slide.id)}
                      disabled={generatingImage[slide.id]}
                    >
                      {generatingImage[slide.id] ? '⏳ Gerando imagem…' : '✨ Gerar imagem com IA'}
                    </button>
                  )}
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
                {isReel ? (
                  <>
                    <p className={styles.urlInputLabel}>Faça upload do vídeo do Reel (MP4 ou MOV · máx. 100 MB):</p>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                        e.target.value = '';
                      }}
                    />
                    {videoUpload ? (
                      <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        ✅ {videoUpload.name}
                      </div>
                    ) : (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploadingVideo}
                        style={{ marginBottom: '0.75rem' }}
                      >
                        {uploadingVideo ? '⏳ Enviando vídeo…' : '📁 Selecionar vídeo'}
                      </button>
                    )}
                    {videoUploadError && <p className={styles.publishError}>{videoUploadError}</p>}
                  </>
                ) : (
                  <>
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
                  </>
                )}
                {publishState.status === 'error' && (
                  <ErrorMessage
                    message={publishState.message}
                    onDismiss={() => setPublishState({ status: 'awaiting_url' })}
                  />
                )}
                <div className={styles.urlButtons}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setPublishState({ status: 'idle' })}
                  >
                    Cancelar
                  </button>
                  <button
                    className={styles.publishBtn}
                    onClick={handleConfirmPublish}
                    disabled={isReel && !videoUpload}
                  >
                    Publicar agora
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.publishBtn} onClick={handlePublishClick}>
                {isReel ? '🎬 Publicar Reel no Instagram' : '📤 Publicar no Instagram'}
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
