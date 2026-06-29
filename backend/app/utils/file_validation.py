"""Validação de arquivos enviados pelo usuário para o Brand Kit."""

import magic
from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/svg+xml",
    "application/pdf",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


async def validate_brand_asset(file: UploadFile) -> bytes:
    """
    Lê o conteúdo do arquivo enviado e valida:
    - Extensão permitida
    - MIME type real (via magic bytes, não apenas o header)
    - Tamanho máximo de 10 MB

    Retorna os bytes do arquivo se tudo estiver válido.
    Lança HTTPException 422 em caso de violação.
    """
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Extensão '{ext}' não permitida. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"Arquivo excede o limite de 10 MB (recebido: {len(content) / 1024 / 1024:.1f} MB)",
        )

    if len(content) == 0:
        raise HTTPException(status_code=422, detail="O arquivo enviado está vazio.")

    detected_mime = magic.from_buffer(content, mime=True)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Tipo de arquivo detectado '{detected_mime}' não é permitido.",
        )

    return content
