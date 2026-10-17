import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "Hospital Badge Generator - МБ Темиртау"
    API_V1_STR: str = "/api"
    
    # Database URL: default to SQLite for quick standalone test or PostgreSQL if DATABASE_URL is set
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{BASE_DIR}/data/badges.db"
    )
    
    STORAGE_DIR: Path = BASE_DIR / "data" / "storage"
    TEMPLATES_DIR: Path = BASE_DIR / "app" / "templates"
    STATIC_DIR: Path = BASE_DIR / "app" / "static"
    
    CORS_ORIGINS: list[str] = ["*"]
    
    # Badge Physical Specs (in mm)
    BADGE_WIDTH_MM: float = 90.0
    BADGE_HEIGHT_MM: float = 60.0
    
    # Colors
    COLOR_PRIMARY_GREEN: str = "#1e5d36"
    COLOR_ACCENT_GREEN: str = "#5da832"

    # GLPI Integration
    GLPI_BASE_URL: str = os.getenv("GLPI_BASE_URL", "https://glpi.gp1.loc/apirest.php")
    GLPI_APP_TOKEN: str = os.getenv("GLPI_APP_TOKEN", "kM9xT2qL8wV5yZ1pB7nR4sA3dE6fH0jC")
    GLPI_USER_TOKEN: str = os.getenv("GLPI_USER_TOKEN", "aa21379b71949f2e2735cf966b22a67fd81aae12")
    GLPI_SERVICE_USER_ID: int = int(os.getenv("GLPI_SERVICE_USER_ID", "10"))
    GLPI_WEB_URL: str = os.getenv("GLPI_WEB_URL", "https://glpi.gp1.loc")

    # Helper Computer Resolver
    HELPER_RESOLVER_URL: str = os.getenv("HELPER_RESOLVER_URL", "http://172.16.16.61/api/internal/resolve-client")
    
settings = Settings()

# Ensure storage directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
(settings.STORAGE_DIR / "pdfs").mkdir(parents=True, exist_ok=True)
(settings.STORAGE_DIR / "previews").mkdir(parents=True, exist_ok=True)
