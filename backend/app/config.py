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
    secret_key: str = "dev-secret-change-in-production"


settings = Settings()
