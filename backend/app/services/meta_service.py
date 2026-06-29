import httpx
from urllib.parse import urlencode
from datetime import datetime, timedelta
from typing import Optional

from app.core import config


def build_oauth_url(state: str) -> str:
    params = {
        "client_id": config.META_CLIENT_ID,
        "redirect_uri": config.META_REDIRECT_URI,
        "scope": ",".join(config.META_SCOPES),
        "response_type": "code",
        "state": state,
    }
    return f"https://www.facebook.com/dialog/oauth?{urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    """Troca o authorization code por um short-lived token e depois por um long-lived token."""
    with httpx.Client() as client:
        # short-lived token
        resp = client.get(
            f"{config.META_API_BASE}/oauth/access_token",
            params={
                "client_id": config.META_CLIENT_ID,
                "client_secret": config.META_CLIENT_SECRET,
                "redirect_uri": config.META_REDIRECT_URI,
                "code": code,
            },
        )
        resp.raise_for_status()
        short_token = resp.json()["access_token"]

        # long-lived token (válido por ~60 dias)
        resp = client.get(
            f"{config.META_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": config.META_CLIENT_ID,
                "client_secret": config.META_CLIENT_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    expires_in = data.get("expires_in", 5184000)  # padrão 60 dias
    return {
        "access_token": data["access_token"],
        "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
    }


def get_instagram_account(access_token: str) -> dict:
    """Retorna o ID e username da conta do Instagram Business vinculada."""
    with httpx.Client() as client:
        # Busca páginas do Facebook do usuário
        resp = client.get(
            f"{config.META_API_BASE}/me/accounts",
            params={"access_token": access_token, "fields": "id,name,instagram_business_account"},
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])

    for page in pages:
        ig = page.get("instagram_business_account")
        if ig:
            ig_id = ig["id"]
            username = _get_ig_username(ig_id, access_token)
            return {"instagram_user_id": ig_id, "instagram_handle": username}

    raise ValueError("Nenhuma conta do Instagram Business encontrada para este usuário.")


def _get_ig_username(ig_user_id: str, access_token: str) -> str:
    with httpx.Client() as client:
        resp = client.get(
            f"{config.META_API_BASE}/{ig_user_id}",
            params={"fields": "username", "access_token": access_token},
        )
        resp.raise_for_status()
    return resp.json().get("username", "")


def validate_token(access_token: str) -> bool:
    """Verifica se o token ainda é válido."""
    try:
        with httpx.Client() as client:
            resp = client.get(
                f"{config.META_API_BASE}/me",
                params={"access_token": access_token},
            )
        return resp.status_code == 200
    except Exception:
        return False
