import os
from functools import lru_cache

from dotenv import load_dotenv


# Load environment variables from a local .env file (if present)
BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, ".env"))


class Settings:
    """
    Central application configuration.
    Values are read from environment variables so they work locally and in production.
    """

    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"
    faiss_root_dir: str = os.path.join(os.path.dirname(__file__), "vectorstore")
    pdf_output_dir: str = os.path.join(os.path.dirname(__file__), "generated_pdfs")
    cache_dir: str = os.path.join(os.path.dirname(__file__), "cache")
    cors_allow_origins: list[str]
    internal_api_key: str
    rate_limit_per_minute: int
    max_request_bytes: int
    max_upload_bytes: int

    def __init__(self) -> None:
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        if not self.groq_api_key:
            # We don't raise here so the app can start without a key for health checks,
            # but LLM calls will fail fast with a clear error message.
            print("WARNING: GROQ_API_KEY is not set. LLM features will not work.")
        origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").strip()
        self.cors_allow_origins = [o.strip() for o in origins.split(",") if o.strip()]
        self.internal_api_key = os.getenv("BACKEND_API_KEY", "").strip()
        self.rate_limit_per_minute = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
        self.max_request_bytes = int(os.getenv("MAX_REQUEST_BYTES", str(25 * 1024 * 1024)))
        self.max_upload_bytes = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))


@lru_cache()
def get_settings() -> Settings:
    return Settings()

