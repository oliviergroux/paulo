from typing import Optional
from uuid import uuid4

from lifecycle_copilot.config import ObjectStorageConfig, get_object_storage_config


class ObjectStorageClient:
    """S3-compatible storage wrapper. Upload/download implemented in PR2+."""

    def __init__(self, config: ObjectStorageConfig):
        self.config = config

    def is_configured(self) -> bool:
        return True


def get_storage_client() -> Optional[ObjectStorageClient]:
    config = get_object_storage_config()
    if not config:
        return None
    return ObjectStorageClient(config)


def build_storage_key(project_id: int, category: str, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return f"projects/{project_id}/{category}/{uuid4().hex}_{safe_name}"
