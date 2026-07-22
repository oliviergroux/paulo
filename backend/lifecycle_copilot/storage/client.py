from typing import Optional

from lifecycle_copilot.config import ObjectStorageConfig, get_object_storage_config


def _get_boto_client():
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError("boto3_unavailable") from exc

    config = get_object_storage_config()
    if not config:
        raise RuntimeError("object_storage_not_configured")

    session = boto3.session.Session(
        aws_access_key_id=config.access_key_id,
        aws_secret_access_key=config.secret_access_key,
        region_name=config.region,
    )
    return session.client("s3", endpoint_url=config.endpoint_url), config


class ObjectStorageClient:
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
    from uuid import uuid4

    safe_name = filename.replace("/", "_").replace("\\", "_")
    return f"projects/{project_id}/{category}/{uuid4().hex}_{safe_name}"


def upload_bytes(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    client, config = _get_boto_client()
    client.put_object(
        Bucket=config.bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return key


def download_bytes(key: str) -> bytes:
    client, config = _get_boto_client()
    response = client.get_object(Bucket=config.bucket, Key=key)
    return response["Body"].read()


def delete_object(key: str) -> None:
    client, config = _get_boto_client()
    client.delete_object(Bucket=config.bucket, Key=key)
