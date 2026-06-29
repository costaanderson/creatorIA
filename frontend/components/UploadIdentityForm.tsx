import { useCallback, useRef, useState } from 'react';
import { ApiError, BrandKitExtractionResult, uploadIdentityFile } from '../lib/api';
import styles from '../styles/UploadIdentityForm.module.css';

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.pdf'];
const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];
const MAX_SIZE_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string): string {
  if (type === 'application/pdf') return '📄';
  if (type === 'image/svg+xml') return '🎨';
  return '🖼️';
}

interface Props {
  onExtracted: (result: BrandKitExtractionResult) => void;
}

export default function UploadIdentityForm({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateAndSet = useCallback((candidate: File) => {
    setError(null);
    setSuccess(false);
    const ext = '.' + candidate.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.includes(candidate.type)) {
      setError('Formato não suportado. Envie PNG, JPG, SVG ou PDF.');
      return;
    }
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. O limite é ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(candidate);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndSet(dropped);
    },
    [validateAndSet]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
    // reset input so the same file can be reselected after clearing
    e.target.value = '';
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await uploadIdentityFile(file);
      setSuccess(true);
      onExtracted(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Falha na extração. Tente novamente ou preencha os campos manualmente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>✨</span>
        <div>
          <p className={styles.headerTitle}>Extrair identidade visual com IA</p>
          <p className={styles.headerSubtitle}>
            Envie um arquivo e o Grok Vision detecta cores, tipografia e estilo automaticamente.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {/* Drop zone (shown when no file is selected) */}
        {!file && !loading && (
          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <span className={styles.dropZoneIcon}>📁</span>
            <p className={styles.dropZoneText}>
              {dragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
            </p>
            <p className={styles.dropZoneHint}>PNG, JPG, SVG ou PDF · máx. {MAX_SIZE_MB} MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          className={styles.fileInput}
          onChange={handleFileChange}
        />

        {/* File preview */}
        {file && !loading && (
          <div className={styles.filePreview}>
            <span className={styles.fileIcon}>{fileIcon(file.type)}</span>
            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>{formatBytes(file.size)}</p>
            </div>
            <button
              className={styles.clearFileBtn}
              onClick={() => { setFile(null); setError(null); setSuccess(false); }}
              title="Remover arquivo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            <p className={styles.loadingText}>Analisando sua identidade visual…</p>
            <p className={styles.loadingHint}>
              O Grok Vision está extraindo cores, tipografia e padrões de layout. Pode levar alguns segundos.
            </p>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className={styles.resultBanner}>
            <span className={styles.resultIcon}>✅</span>
            <div>
              <p className={styles.resultTitle}>Identidade visual extraída!</p>
              <p className={styles.resultDesc}>
                Os campos abaixo foram preenchidos com as sugestões da IA. Revise e salve quando estiver satisfeita.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Extract button */}
        {file && !loading && !success && (
          <button className={styles.extractBtn} onClick={handleExtract}>
            Extrair com IA
          </button>
        )}

        {/* Allow re-extraction after success */}
        {success && (
          <button
            className={styles.extractBtn}
            onClick={() => { setFile(null); setSuccess(false); setError(null); }}
          >
            Enviar outro arquivo
          </button>
        )}
      </div>
    </div>
  );
}
