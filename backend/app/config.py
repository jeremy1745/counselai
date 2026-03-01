from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://counselai:counselai@localhost:5432/counselai"
    qdrant_url: str = "http://localhost:6333"
    ollama_url: str = "http://localhost:11434"
    upload_dir: str = "./data/uploads"

    embedding_model: str = "nomic-embed-text"
    chat_model: str = "llama3.2:3b"
    chunk_size: int = 512
    chunk_overlap: int = 64
    top_k: int = 10
    qdrant_collection: str = "counselai_chunks"

    secret_key: str
    allowed_origins: str = "http://localhost:3000"
    access_token_expire_minutes: int = 480
    max_upload_size_mb: int = 50
    max_failed_logins: int = 5
    lockout_duration_minutes: int = 15

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "dev-secret-change-in-production":
            raise ValueError("SECRET_KEY must be changed from the default dev value")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v


settings = Settings()
