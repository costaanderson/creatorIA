import { useCallback, useEffect, useState } from 'react';
import { ApiError, BrandKit, BrandKitExtractionResult, BrandKitManualPayload, HashtagPreset, saveBrandKit } from '../lib/api';
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
  const [niche, setNiche] = useState(initialData?.niche ?? '');
  const [hashtagPreset, setHashtagPreset] = useState<HashtagPreset>(initialData?.hashtag_preset ?? 'medium');

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
    setNiche(initialData.niche ?? '');
    setHashtagPreset(initialData.hashtag_preset ?? 'medium');
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
      niche: niche.trim() || undefined,
      hashtag_preset: hashtagPreset,
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

        {/* Niche */}
        <div className={styles.field}>
          <label className={styles.label}>
            Nicho / Especialidade{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>— opcional</span>
          </label>
          <input
            type="text"
            className={styles.input}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            maxLength={200}
            placeholder="Ex: Design de sobrancelhas, Maquiagem artística, Fotografia de casamento"
          />
          <p className={styles.hint}>
            A IA usará esse nicho para gerar legendas e hashtags específicas da sua área de atuação.
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

        {/* Hashtag preset */}
        <div className={styles.field}>
          <label className={styles.label}>Quantidade de hashtags por post</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(
              [
                { value: 'few',    label: 'Poucas',  range: '3–5'   },
                { value: 'medium', label: 'Médias',  range: '8–12'  },
                { value: 'many',   label: 'Muitas',  range: '20–30' },
              ] as { value: HashtagPreset; label: string; range: string }[]
            ).map(({ value, label, range }) => (
              <button
                key={value}
                type="button"
                onClick={() => setHashtagPreset(value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: hashtagPreset === value ? '2px solid #6366f1' : '2px solid #374151',
                  background: hashtagPreset === value ? '#1e1b4b' : '#1f2937',
                  color: hashtagPreset === value ? '#a5b4fc' : '#9ca3af',
                  cursor: 'pointer',
                  fontWeight: hashtagPreset === value ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s',
                }}
              >
                {label}
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7 }}>{range} hashtags</span>
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            Define quantas hashtags a IA vai gerar. A Bruna prefere poucas — menos trabalho manual depois.
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
