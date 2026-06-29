import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parents[3] / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Supabase
SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Meta / Instagram
META_CLIENT_ID: str = os.getenv("META_CLIENT_ID", "")
META_CLIENT_SECRET: str = os.getenv("META_CLIENT_SECRET", "")
META_REDIRECT_URI: str = os.getenv("META_REDIRECT_URI", "http://localhost:8000/auth/instagram/callback")
META_API_VERSION: str = os.getenv("META_API_VERSION", "v19.0")
META_API_BASE: str = f"https://graph.facebook.com/{META_API_VERSION}"

# Instagram (token já existente no .env, usado em modo direto)
INSTAGRAM_ACCESS_TOKEN: str = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
INSTAGRAM_BUSINESS_ID: str = os.getenv("INSTAGRAM_BUSINESS_ID", "")

# Criptografia de tokens
TOKEN_ENCRYPTION_KEY: str = os.getenv("TOKEN_ENCRYPTION_KEY", "")

# MVP: ID fixo do único usuário (single-user)
MVP_USER_ID: str = os.getenv("MVP_USER_ID", "00000000-0000-0000-0000-000000000001")

# OpenAI — provedor de IA do projeto
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL: str = "https://api.openai.com/v1"
OPENAI_VISION_MODEL: str = "gpt-4o"
OPENAI_TEXT_MODEL: str = "gpt-4o"

# OAuth scopes necessários para publicação no Instagram
META_SCOPES = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_read_engagement",
    "pages_show_list",
]
