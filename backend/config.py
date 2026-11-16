from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

_PLACEHOLDER_KEYS = {
    "",
    "your_api_key_here",
    "your-api-key-here",
    "replace_me",
    "changeme",
}


def _parse_origins(raw: str) -> list[str]:
    origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://127.0.0.1:3000"]


@dataclass(frozen=True)
class Config:
    gemini_api_key: str
    gemini_model: str
    flask_host: str
    flask_port: int
    flask_debug: bool
    cors_origins: list[str]
    gemini_timeout_seconds: float
    max_content_length: int = 16 * 1024

    @property
    def is_gemini_configured(self) -> bool:
        return self.gemini_api_key.strip().lower() not in _PLACEHOLDER_KEYS


def load_config() -> Config:
    load_dotenv(BACKEND_DIR / ".env", override=False)
    port_raw = os.getenv("FLASK_PORT", "5000").strip()
    timeout_raw = os.getenv("GEMINI_TIMEOUT_SECONDS", "30").strip()

    try:
        port = int(port_raw)
    except ValueError:
        port = 5000

    try:
        timeout = max(5.0, float(timeout_raw))
    except ValueError:
        timeout = 30.0

    return Config(
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-4-hydrogen").strip() or "gemini-4-hydrogen",
        flask_host=os.getenv("FLASK_HOST", "127.0.0.1").strip() or "127.0.0.1",
        flask_port=port,
        flask_debug=os.getenv("FLASK_DEBUG", "false").strip().lower() in {"1", "true", "yes"},
        cors_origins=_parse_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
        gemini_timeout_seconds=timeout,
    )
