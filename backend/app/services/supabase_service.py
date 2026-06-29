import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega .env na raiz do projeto (ou caminho passado)
env_path = Path(__file__).parents[3] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL:
    raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL não configurado nas variáveis de ambiente")
if not SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY não configurado nas variáveis de ambiente")

# Cliente de serviço (admin) usado no backend
supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def get_table(table_name: str):
    """Retorna um wrapper da tabela para operações CRUD.
    
    Exemplo:
        rows = supabase_service.get_table("instagram_connections").select("*").execute()
    """
    return supabase.table(table_name)

def insert(table_name: str, data: dict):
    """Insere um registro na tabela especificada.
    Retorna o objeto de resposta da biblioteca supabase-py.
    """
    return supabase.table(table_name).insert(data).execute()

def update(table_name: str, record_id: str, data: dict):
    """Atualiza registro com `id` = record_id.
    """
    return supabase.table(table_name).update(data).eq("id", record_id).execute()

def delete(table_name: str, record_id: str):
    """Remove registro da tabela.
    """
    return supabase.table(table_name).delete().eq("id", record_id).execute()
