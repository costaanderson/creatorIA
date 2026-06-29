import { useCallback, useEffect, useState } from 'react';
import { ApiError, BrandKit, BrandKitExtractionResult, BrandKitManualPayload, saveBrandKit } from '../lib/api';
import UploadIdentityForm from './UploadIdentityForm';
import styles from '../styles/BrandKitForm.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza uma string para HEX válido com #. Retorna o original se inválido. */
function toHex(value: string): string {
  const cleaned = value.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  return value;
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

const DEFAULT_PRIMARY = '#6366F1';
const DEFAULT_SECONDARY = '#F97316';
const MAX_SECONDARY = 4;

// ─── Color input ──────────────────────────────────────────────────────────────

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ value, onChange }: ColorInputProps) {
  const safe = isValidHex(value) ? value : DEFAULT_PRIMARY;

  return (
    <div className={styles.colorRow}>
      <label className={styles.colorSwatch}>
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      </label>
      <input
        type="text"
        className={styles.colorHexInput}
        value={value}
        onChange={(e) => onChange(toHex(e.target.value))}
        maxLength={7}
        spellCheck={false}
        placeholder="#000000"
      />
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface Props {
  initialData?: BrandKit | null;
  onSaved?: (kit: BrandKit) => void;
}

export default function BrandKitForm({ initialData, onSaved }: Props) {
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color ?? DEFAULT_PRIMARY);
  const [secondaryColors, setSecondaryColors] = useState<string[]>(
    initialData?.secondary_colors?.length ? initialData.secondary_colors : [DEFAULT_SECONDARY]
  );
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? '');
  const [toneOfVoice, setToneOfVoice] = useState(initialData?.tone_of_voice ?? '');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form when parent loads data
  useEffect(() => {
    if (!initialData) return;
    setPrimaryColor(initialData.primary_color ?? DEFAULT_PRIMARY);
    setSecondaryColors(
      initialData.secondary_colors?.length ? initialData.secondary_colors : [DEFAULT_SECONDARY]
    );
    setLogoUrl(initialData.logo_url ?? '');
    setToneOfVoice(initialData.tone_of_voice ?? '');
  }, [initialData]);

  // Fill fields from AI extraction
  const handleExtracted = useCallback((result: BrandKitExtractionResult) => {
    if (result.primary_color) setPrimaryColor(result.primary_color);
    if (result.secondary_colors?.length) setSecondaryColors(result.secondary_colors.slice(0, MAX_SECONDARY));
    if (result.logo_url) setLogoUrl(result.logo_url);
    // visual_style and typography_suggestion aren't editable in MVP form,
    // but they will be sent to the backend on save as part of extraction context.
  }, []);

  const handleAddSecondary = () => {
    if (secondaryColors.length >= MAX_SECONDARY) return;
    setSecondaryColors((prev) => [...prev, DEFAULT_SECONDARY]);
  };

  const handleRemoveSecondary = (index: number) => {
    setSecondaryColors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSecondaryChange = (index: number, value: string) => {
    setSecondaryColors((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!isValidHex(primaryColor)) {
      setSaveError('Cor primária inválida. Use o formato #RRGGBB.');
      return;
    }

    const payload: BrandKitManualPayload = {
      primary_color: primaryColor,
      secondary_colors: secondaryColors.filter(isValidHex),
      logo_url: logoUrl.trim() || undefined,
      tone_of_voice: toneOfVoice.trim() || undefined,
    };

    setSaving(true);
    try {
      const saved = await saveBrandKit(payload);
      setSaveSuccess(true);
      onSaved?.(saved);
      // Auto-hide success after 4 s
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : 'Erro ao salvar. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Upload with AI */}
      <UploadIdentityForm onExtracted={handleExtracted} />

      {/* Manual form */}
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Primary color */}
        <div className={styles.field}>
          <label className={styles.label}>Cor primária da marca</label>
          <ColorInput value={primaryColor} onChange={setPrimaryColor} />
          {!isValidHex(primaryColor) && (
            <p className={styles.hint} style={{ color: '#dc2626' }}>
              Formato inválido. Use #RRGGBB (ex: #FF5733).
            </p>
          )}
        </div>

        {/* Secondary colors */}
        <div className={styles.field}>
          <label className={styles.label}>
            Cores secundárias{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>— opcional</span>
          </label>
          <div className={styles.secondaryList}>
            {secondaryColors.map((color, i) => (
              <div key={i} className={styles.secondaryItem}>
                <ColorInput value={color} onChange={(v) => handleSecondaryChange(i, v)} />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveSecondary(i)}
                  title="Remover esta cor"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {secondaryColors.length < MAX_SECONDARY && (
            <button type="button" className={styles.addColorBtn} onClick={handleAddSecondary}>
              + Adicionar cor secundária
            </button>
          )}
        </div>

        {/* Logo URL */}
        <div className={styles.field}>
          <label className={styles.label}>
            URL do logo{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>— opcional</span>
          </label>
          <input
            type="url"
            className={styles.input}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://sua-marca.com/logo.png"
          />
          <p className={styles.hint}>
            Cole o link público do seu logo (PNG ou SVG). O upload direto estará disponível em breve.
          </p>
        </div>

        {/* Tone of voice */}
        <div className={styles.field}>
          <label className={styles.label}>
            Tom de voz{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>— opcional</span>
          </label>
          <textarea
            className={styles.textarea}
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            rows={4}
            placeholder="Ex: Descontraída, próxima do público, usa emojis moderadamente, evita jargões técnicos. Foca em inspirar e educar designers iniciantes."
          />
          <p className={styles.hint}>
            Descreva a personalidade da marca. A IA usará esse texto para gerar legendas e hashtags no
            estilo certo.
          </p>
        </div>

        {/* Feedback */}
        {saveSuccess && (
          <div className={styles.successBanner}>
            ✅ Brand Kit salvo com sucesso!
          </div>
        )}
        {saveError && (
          <div className={styles.errorBanner}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* Submit */}
        <div className={styles.submitRow}>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? (
              <>
                <span className={styles.spinner} />
                Salvando…
              </>
            ) : (
              'Salvar Brand Kit'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
