import { useRef, useState } from 'react';
import { ContentGenerateRequest, ContentType } from '../lib/api';
import styles from '../styles/ContentGeneratorForm.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface ImageSlot {
  file: File | null;
  url: string;       // URL pública após upload
  preview: string;   // object URL local para preview
  uploading: boolean;
  error: string | null;
}

function emptySlot(): ImageSlot {
  return { file: null, url: '', preview: '', uploading: false, error: null };
}

interface Props {
  onGenerate: (request: ContentGenerateRequest) => void;
  loading: boolean;
}

export default function ContentGeneratorForm({ onGenerate, loading }: Props) {
  const [theme, setTheme] = useState('');
  const [type, setType] = useState<ContentType>('single_post');
  const [slidesCount, setSlidesCount] = useState(3);
  const [slots, setSlots] = useState<ImageSlot[]>([emptySlot()]);

  const requiredSlots = type === 'carousel' ? slidesCount : 1;
  // keep slots array in sync
  const syncedSlots = Array.from({ length: requiredSlots }, (_, i) => slots[i] ?? emptySlot());

  const updateSlot = (index: number, patch: Partial<ImageSlot>) => {
    setSlots((prev) => {
      const next = Array.from({ length: requiredSlots }, (_, i) => prev[i] ?? emptySlot());
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    updateSlot(index, { file, preview, uploading: true, error: null, url: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(`${API_BASE}/content/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.detail ?? `Erro ${resp.status}`);
      }

      const { url } = await resp.json();
      updateSlot(index, { uploading: false, url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no upload';
      updateSlot(index, { uploading: false, error: msg });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = theme.trim();
    if (!trimmed || loading) return;

    const imageUrls = syncedSlots.map((s) => s.url).filter(Boolean);

    onGenerate({
      theme: trimmed,
      type,
      slides_count: type === 'carousel' ? slidesCount : undefined,
      image_urls: imageUrls,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Tema */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="theme">
          Tema do conteúdo
        </label>
        <textarea
          id="theme"
          className={styles.textarea}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex: 5 erros que designers iniciantes cometem no logo"
          rows={3}
          maxLength={500}
          disabled={loading}
          required
        />
        <span className={styles.charCount}>{theme.length}/500</span>
      </div>

      {/* Tipo */}
      <div className={styles.field}>
        <span className={styles.label}>Tipo de post</span>
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'single_post' ? styles.typeBtnActive : ''}`}
            onClick={() => { setType('single_post'); setSlots([emptySlot()]); }}
            disabled={loading}
          >
            <span className={styles.typeIcon}>🖼️</span>
            Post único
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'carousel' ? styles.typeBtnActive : ''}`}
            onClick={() => { setType('carousel'); setSlots(Array.from({ length: slidesCount }, emptySlot)); }}
            disabled={loading}
          >
            <span className={styles.typeIcon}>📑</span>
            Carrossel
          </button>
        </div>
      </div>

      {/* Slides (apenas carousel) */}
      {type === 'carousel' && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="slides">
            Número de slides
            <span className={styles.slidesValue}>{slidesCount}</span>
          </label>
          <input
            id="slides"
            type="range"
            min={2}
            max={10}
            value={slidesCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setSlidesCount(n);
              setSlots(Array.from({ length: n }, (_, i) => slots[i] ?? emptySlot()));
            }}
            className={styles.slider}
            disabled={loading}
          />
          <div className={styles.sliderLabels}>
            <span>2</span>
            <span>10</span>
          </div>
        </div>
      )}

      {/* Imagens */}
      <div className={styles.field}>
        <span className={styles.label}>
          {type === 'single_post' ? 'Imagem do post' : 'Imagens dos slides'}
        </span>

        {syncedSlots.map((slot, i) => (
          <ImagePicker
            key={i}
            label={type === 'carousel' ? `Slide ${i + 1}` : undefined}
            slot={slot}
            disabled={loading}
            onChange={(file) => handleFileChange(i, file)}
            onClear={() => {
              if (slot.preview) URL.revokeObjectURL(slot.preview);
              updateSlot(i, emptySlot());
            }}
          />
        ))}

        <span className={styles.hint}>
          JPEG, PNG ou WebP · máx. 10 MB · {type === 'carousel' ? 'uma por slide' : 'proporção 1:1 ou 4:5 recomendada'}
        </span>
      </div>

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={loading || theme.trim().length < 5}
      >
        {loading ? (
          <>
            <span className={styles.spinner} />
            Gerando conteúdo…
          </>
        ) : (
          '✨ Gerar conteúdo'
        )}
      </button>
    </form>
  );
}

// ─── Sub-componente: picker de imagem individual ──────────────────────────────

interface PickerProps {
  label?: string;
  slot: ImageSlot;
  disabled: boolean;
  onChange: (file: File) => void;
  onClear: () => void;
}

function ImagePicker({ label, slot, disabled, onChange, onClear }: PickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.pickerWrapper}>
      {label && <span className={styles.pickerLabel}>{label}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
          e.target.value = '';
        }}
      />

      {!slot.preview ? (
        <button
          type="button"
          className={styles.pickerBtn}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          📁 Selecionar arquivo
        </button>
      ) : (
        <div className={styles.pickerPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.preview} alt="preview" className={styles.previewThumb} />
          <div className={styles.previewInfo}>
            <span className={styles.previewName}>{slot.file?.name ?? 'imagem'}</span>
            {slot.uploading && <span className={styles.uploadingText}>⏳ Enviando…</span>}
            {slot.url && <span className={styles.uploadedText}>✅ Pronto</span>}
            {slot.error && <span className={styles.uploadErrorText}>⚠️ {slot.error}</span>}
          </div>
          <button
            type="button"
            className={styles.pickerClearBtn}
            onClick={onClear}
            disabled={disabled || slot.uploading}
            title="Remover imagem"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
