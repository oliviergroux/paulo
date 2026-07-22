import os
from typing import Optional

from openai import OpenAI


def get_openai_client() -> Optional[OpenAI]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def chat_completion(prompt: str, model: str = "gpt-4o-mini") -> str:
    client = get_openai_client()
    if not client:
        raise RuntimeError("openai_not_configured")
    result = client.responses.create(model=model, input=prompt)
    return (result.output_text or "").strip()


def embed_texts(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    client = get_openai_client()
    if not client:
        raise RuntimeError("openai_not_configured")
    if not texts:
        return []
    response = client.embeddings.create(model=model, input=texts)
    return [item.embedding for item in response.data]
