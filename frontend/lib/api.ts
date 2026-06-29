const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandKit {
  id?: string;
  user_id?: string;
  primary_color: string;
  secondary_colors: string[];
  logo_url?: string;
  tone_of_voice?: string;
  visual_style?: string;
  typography_suggestion?: string;
  layout_patterns?: Record<string, unknown>;
  source?: 'manual' | 'ai_extracted';
  created_at?: string;
  updated_at?: string;
}

export interface BrandKitManualPayload {
  primary_color: string;
  secondary_colors?: string[];
  logo_url?: string;
  tone_of_voice?: string;
}

export interface BrandKitExtractionResult {
  primary_color?: string;
  secondary_colors?: string[];
  visual_style?: string;
  typography_suggestion?: string;
  layout_patterns?: Record<string, unknown>;
  logo_url?: string;
  asset_id?: string;
  message?: string;
}

export interface InstagramStatus {
  connected: boolean;
  instagram_handle?: string;
  token_expires_at?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }

  if (!response.ok) {
    let detail = `Erro ${response.status}`;
    try {
      const body = await response.json();
      const raw = body?.detail ?? detail;
      detail = Array.isArray(raw)
        ? raw.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join('; ')
        : String(raw);
    } catch {
      // ignore parse error
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ─── Brand Kit ────────────────────────────────────────────────────────────────

/** Retorna o Brand Kit do usuário, ou null se ainda não configurado. */
export async function getBrandKit(): Promise<BrandKit | null> {
  try {
    return await request<BrandKit>('/brand-kit');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Cria ou atualiza o Brand Kit manualmente. */
export async function saveBrandKit(data: BrandKitManualPayload): Promise<BrandKit> {
  return request<BrandKit>('/brand-kit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Envia um arquivo de identidade visual (PNG, JPG, SVG ou PDF) para extração via IA.
 * Retorna as sugestões extraídas pelo Grok Vision.
 */
export async function uploadIdentityFile(file: File): Promise<BrandKitExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/brand-kit/upload`, {
      method: 'POST',
      body: formData,
      // Não definir Content-Type: o browser adiciona boundary do multipart automaticamente
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }

  if (!response.ok) {
    let detail = `Erro ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<BrandKitExtractionResult>;
}

// ─── Content ──────────────────────────────────────────────────────────────────

export type ContentType = 'single_post' | 'carousel';
export type ContentStatus = 'draft' | 'approved' | 'publishing' | 'published' | 'failed';

export interface ContentGenerateRequest {
  theme: string;
  type: ContentType;
  slides_count?: number;
  /** Frontend-only: image URLs collected from the form; not sent to backend. */
  image_urls?: string[];
}

export interface SlideResponse {
  id: string;
  project_id: string;
  slide_order: number;
  title?: string;
  body?: string;
  visual_prompt?: string;
  media_url?: string;
  created_at: string;
}

export interface ContentProjectResponse {
  id: string;
  user_id: string;
  type: ContentType;
  theme: string;
  slides_count: number;
  caption?: string;
  hashtags: string[];
  status: ContentStatus;
  instagram_media_id?: string;
  instagram_post_url?: string;
  error_message?: string;
  slides: SlideResponse[];
  created_at: string;
  updated_at: string;
}

export async function generateContent(
  data: ContentGenerateRequest
): Promise<ContentProjectResponse> {
  // image_urls is frontend-only; strip before sending to backend
  const { image_urls: _image_urls, ...payload } = data;
  return request<ContentProjectResponse>('/content/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getContent(id: string): Promise<ContentProjectResponse> {
  return request<ContentProjectResponse>(`/content/${id}`);
}

export async function listContent(): Promise<ContentProjectResponse[]> {
  return request<ContentProjectResponse[]>('/content');
}

export interface ContentUpdateRequest {
  caption?: string;
  hashtags?: string[];
  slides?: Array<{ id: string; title?: string; body?: string; visual_prompt?: string }>;
}

export async function updateContent(
  id: string,
  data: ContentUpdateRequest,
): Promise<ContentProjectResponse> {
  return request<ContentProjectResponse>(`/content/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface PublishResponse {
  status: string;
  instagram_media_id?: string;
  instagram_post_url?: string;
  message: string;
}

export async function publishContent(
  projectId: string,
  imageUrls: string[],
): Promise<PublishResponse> {
  return request<PublishResponse>(`/instagram/publish/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ image_urls: imageUrls }),
  });
}

// ─── Instagram ────────────────────────────────────────────────────────────────

export async function getInstagramStatus(): Promise<InstagramStatus> {
  return request<InstagramStatus>('/auth/instagram/status');
}

export async function disconnectInstagram(): Promise<void> {
  await request<unknown>('/auth/instagram/disconnect', { method: 'POST' });
}
