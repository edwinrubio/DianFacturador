from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
import os

# Set required env vars for tests
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests")
os.environ.setdefault("FERNET_KEY", "dGVzdC1mZXJuZXQta2V5LWZvci10ZXN0aW5nMTIzNA==")  # base64 test key


def test_hash_and_verify_password():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_token():
    token = create_access_token({"sub": "admin"})
    payload = decode_access_token(token)
    assert payload["sub"] == "admin"
    assert "exp" in payload
