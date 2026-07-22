import os
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ObjectStorageConfig:
    bucket: str
    region: str
    access_key_id: str
    secret_access_key: str
    endpoint_url: Optional[str]
    public_base_url: Optional[str]


def get_object_storage_config() -> Optional[ObjectStorageConfig]:
    bucket = (os.getenv("LC_STORAGE_BUCKET") or "").strip()
    if not bucket:
        return None

    access_key_id = (os.getenv("LC_STORAGE_ACCESS_KEY_ID") or "").strip()
    secret_access_key = (os.getenv("LC_STORAGE_SECRET_ACCESS_KEY") or "").strip()
    if not access_key_id or not secret_access_key:
        return None

    endpoint_url = (os.getenv("LC_STORAGE_ENDPOINT_URL") or "").strip() or None
    public_base_url = (os.getenv("LC_STORAGE_PUBLIC_BASE_URL") or "").strip() or None

    return ObjectStorageConfig(
        bucket=bucket,
        region=(os.getenv("LC_STORAGE_REGION") or "auto").strip(),
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
        endpoint_url=endpoint_url,
        public_base_url=public_base_url,
    )


def object_storage_configured() -> bool:
    return get_object_storage_config() is not None
