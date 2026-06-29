from cryptography.fernet import Fernet
from app.core.config import TOKEN_ENCRYPTION_KEY


def _get_fernet() -> Fernet:
    if not TOKEN_ENCRYPTION_KEY:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY não configurada. "
            "Gere uma chave com: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(TOKEN_ENCRYPTION_KEY.encode())


def encrypt_token(plain_token: str) -> str:
    return _get_fernet().encrypt(plain_token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    return _get_fernet().decrypt(encrypted_token.encode()).decode()
