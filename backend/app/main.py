import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.routes import instagram_auth, brand_kit, content, publish

logger = logging.getLogger(__name__)

app = FastAPI(title="CreatorAI Backend", version="0.1.0")

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(instagram_auth.router)
app.include_router(brand_kit.router)
app.include_router(content.router)
app.include_router(publish.router)

# Variáveis obrigatórias para o funcionamento da aplicação
_REQUIRED_ENV_VARS = [
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TOKEN_ENCRYPTION_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
]


@app.on_event("startup")
async def validate_env() -> None:
    missing = [var for var in _REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing:
        msg = f"Variáveis de ambiente obrigatórias não configuradas: {', '.join(missing)}"
        logger.critical(msg)
        raise RuntimeError(msg)
    logger.info("Variáveis de ambiente validadas com sucesso.")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
