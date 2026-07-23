import { useRef, useState } from 'react';
import { ContentGenerateRequest, ContentType } from '../lib/api';
import styles from '../styles/ContentGeneratorForm.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Validação de dimensões ───────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;    // passa nos requisitos do Instagram
  warn: boolean;  // passa, mas não é o ideal
  message: string;
  width?: number;
  height?: number;
}

function validateImageDimensions(w: number, h: number): ValidationResult {
  const ratio = w / h;

  if (w < 320) {
    return { ok: false, warn: false, message: `Muito pequena (${w}×${h}px). Instagram exige mínimo 320px de largura.`, width: w, height: h };
  }
  if (ratio < 0.79) {
    return { ok: false, warn: false, message: `Proporção muito estreita (${w}×${h}px). Máximo: 4:5 — use ex: 1080×1350.`, width: w, height: h };
  }
  if (ratio > 1.92) {
    return { ok: false, warn: false, message: `Proporção muito larga (${w}×${h}px). Máximo: 1.91:1 — use ex: 1080×566.`, width: w, height: h };
  }

  const isSquare = Math.abs(ratio - 1) < 0.03;
  const isPortrait = Math.abs(ratio - 0.8) < 0.03;

  if (isSquare) {
    return { ok: true, warn: false, message: `${w}×${h}px — proporção 1:1, ideal para feed`, width: w, height: h };
  }
  if (isPortrait) {
    return { ok: true, warn: false, message: `${w}×${h}px — proporção 4:5, ocupa mais tela no feed`, width: w, height: h };
  }
  return { ok: true, warn: true, message: `${w}×${h}px — aceita pelo Instagram, mas 1:1 ou 4:5 é recomendado`, width: w, height: h };
}

async function getValidationFromObjectUrl(objectUrl: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(validateImageDimensions(img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve({ ok: true, warn: false, message: 'Não foi possível verificar as dimensões.' });
    img.src = objectUrl;
  });
}

// ─── Slot de imagem ───────────────────────────────────────────────────────────

interface ImageSlot {
  file: File | null;
  url: string;       // URL pública após upload
  preview: string;   // object URL local para preview
  uploading: boolean;
  error: string | null;
  validation: ValidationResult | null;
}

function emptySlot(): ImageSlot {
  return { file: null, url: '', preview: '', uploading: false, error: null, validation: null };
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
    updateSlot(index, { file, preview, uploading: true, error: null, url: '', validation: null });

    // Valida dimensões antes de enviar ao backend
    const validation = await getValidationFromObjectUrl(preview);
    updateSlot(index, { validation });

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

    const imageUrls = type !== 'reel' ? syncedSlots.map((s) => s.url).filter(Boolean) : [];

    onGenerate({
      theme: trimmed,
      type,
      slides_count: type === 'carousel' ? slidesCount : type === 'reel' ? slidesCount : undefined,
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
        <span className={styles.label}>Tipo de conteúdo</span>
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
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'reel' ? styles.typeBtnActive : ''}`}
            onClick={() => { setType('reel'); setSlots([]); setSlidesCount(4); }}
            disabled={loading}
          >
            <span className={styles.typeIcon}>🎬</span>
            Reel
          </button>
        </div>
      </div>

      {/* Slides (carousel) ou Cenas (reel) */}
      {(type === 'carousel' || type === 'reel') && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="slides">
            {type === 'carousel' ? 'Número de slides' : 'Número de cenas'}
            <span className={styles.slidesValue}>{slidesCount}</span>
          </label>
          <input
            id="slides"
            type="range"
            min={type === 'reel' ? 3 : 2}
            max={type === 'reel' ? 6 : 10}
            value={slidesCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setSlidesCount(n);
              if (type === 'carousel') {
                setSlots(Array.from({ length: n }, (_, i) => slots[i] ?? emptySlot()));
              }
            }}
            className={styles.slider}
            disabled={loading}
          />
          <div className={styles.sliderLabels}>
            <span>{type === 'reel' ? 3 : 2}</span>
            <span>{type === 'reel' ? 6 : 10}</span>
          </div>
          {type === 'reel' && (
            <span className={styles.hint}>
              Cada cena representa ~3–8 segundos de vídeo. A IA vai gerar o roteiro completo.
            </span>
          )}
        </div>
      )}

      {/* Imagens (post único e carrossel) — não exibido para reel */}
      {type !== 'reel' && (
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
            JPEG, PNG ou WebP · máx. 10 MB · recomendado 1080×1080px (1:1) ou 1080×1350px (4:5)
          </span>
        </div>
      )}

      {/* Informações de requisitos para Reel */}
      {type === 'reel' && (
        <div className={styles.reelInfo}>
          <p className={styles.reelInfoTitle}>Requisitos de vídeo para Reel</p>
          <ul className={styles.reelInfoList}>
            <li>Resolução: <strong>1080×1920px</strong> (proporção 9:16 — vertical)</li>
            <li>Formato: <strong>MP4 ou MOV</strong></li>
            <li>Duração máxima: <strong>90 segundos</strong></li>
            <li>Tamanho máximo: <strong>100 MB</strong></li>
          </ul>
          <p className={styles.reelInfoNote}>O upload do vídeo é feito na tela de revisão, após a IA gerar o roteiro.</p>
        </div>
      )}

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

  const v = slot.validation;
  const validationClass = v
    ? v.ok && !v.warn
      ? styles.validOk
      : v.ok && v.warn
      ? styles.validWarn
      : styles.validError
    : null;
  const validationIcon = v
    ? v.ok && !v.warn
      ? '✅'
      : v.ok && v.warn
      ? '⚠️'
      : '❌'
    : null;

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
        <>
          <div className={`${styles.pickerPreview} ${v && !v.ok ? styles.pickerPreviewInvalid : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slot.preview} alt="preview" className={styles.previewThumb} />
            <div className={styles.previewInfo}>
              <span className={styles.previewName}>{slot.file?.name ?? 'imagem'}</span>
              {slot.uploading && <span className={styles.uploadingText}>⏳ Validando e enviando…</span>}
              {!slot.uploading && slot.url && !v && <span className={styles.uploadedText}>✅ Pronto</span>}
              {!slot.uploading && slot.url && v && <span className={styles.uploadedText}>✅ Enviado</span>}
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

          {v && (
            <span className={validationClass ?? undefined}>
              {validationIcon} {v.message}
            </span>
          )}
        </>
      )}
    </div>
  );
}
