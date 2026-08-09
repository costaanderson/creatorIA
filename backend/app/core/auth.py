import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core import config

bearer_scheme = HTTPBearer()

# Supabase JWKS endpoint — usado para verificar tokens ES256 (novo padrão do Supabase)
_SUPABASE_JWKS_URI = f"{config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(_SUPABASE_JWKS_URI, cache_keys=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Valida o JWT emitido pelo Supabase Auth.
    Suporta ES256 (novo padrão, chaves assimétricas via JWKS)
    e HS256 (legacy secret) como fallback.
    O campo 'sub' contém o user_id (UUID do usuário autenticado).
    """
    token = credentials.credentials

    # Tentativa 1: ES256 via JWKS (novo padrão do Supabase)
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expirado. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        pass

    # Tentativa 2: HS256 via legacy JWT secret (fallback)
    if config.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                config.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token expirado. Faça login novamente.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            pass

    raise HTTPException(
        status_code=401,
        detail="Token inválido.",
        headers={"WWW-Authenticate": "Bearer"},
    )
