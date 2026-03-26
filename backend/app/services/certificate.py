"""Certificate (.p12/.pfx) file handling: validation, storage, passphrase encryption."""
from pathlib import Path

import aiofiles
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.serialization import pkcs12


def validate_pkcs12(content: bytes, passphrase: str) -> bool:
    """Attempt to parse a PKCS12 file with the given passphrase.
    Returns True if valid, raises ValueError if invalid.
    """
    try:
        private_key, certificate, chain = pkcs12.load_key_and_certificates(
            content, passphrase.encode()
        )
        if private_key is None or certificate is None:
            raise ValueError("Certificate file does not contain a private key or certificate")
        return True
    except Exception as e:
        raise ValueError(f"Certificado invalido o contrasena incorrecta: {e}")


async def save_certificate_file(content: bytes, storage_path: str) -> str:
    """Save .p12 file to the certificate storage volume.
    Returns the full path to the saved file.
    """
    cert_dir = Path(storage_path)
    cert_dir.mkdir(parents=True, exist_ok=True)
    cert_path = cert_dir / "certificate.p12"
    async with aiofiles.open(cert_path, "wb") as f:
        await f.write(content)
    return str(cert_path)


def encrypt_passphrase(passphrase: str, fernet_key: str) -> bytes:
    """Encrypt the certificate passphrase using Fernet symmetric encryption."""
    fernet = Fernet(fernet_key.encode() if isinstance(fernet_key, str) else fernet_key)
    return fernet.encrypt(passphrase.encode())


def decrypt_passphrase(encrypted: bytes, fernet_key: str) -> str:
    """Decrypt the certificate passphrase."""
    fernet = Fernet(fernet_key.encode() if isinstance(fernet_key, str) else fernet_key)
    return fernet.decrypt(encrypted).decode()
