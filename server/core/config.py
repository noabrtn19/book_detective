import os

# Auth: JWT Config
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Models paths
YOLO_MODEL_PATH = os.path.abspath("../models_weights/yolo/best.pt") # .pt file
PADDLEOCR_MODEL_PATH = os.path.abspath("../models_weights/paddleocr/") # folder

# PostgreSQL database (if modified, edit the sqlalchemy.url variable in alembic.ini)
POSTGRESQL_USER = "book_detective_admin"
POSTGRESQL_PASSWORD = "a4fg86"
POSTGRESQL_PORT = 5432
POSTGRESQL_DATABASE = "book_detective_db"

# Inventory session manager
TTL_SECONDS = 3600 # How long should we keep an inactive user's CSV in RAM before expiring the session?

# Default detection params
DEFAULT_YOLO_CONF_THRESHOLD: float = 0.25
DEFAULT_MATCH_CONF_THRESHOLD: float = 50.0
DEFAULT_MATCH_AMBIGUITY_RATIO: float = 1.3