from dataclasses import dataclass
from typing import List, Optional
from time import time
from enum import Enum
from core.config import DEFAULT_YOLO_CONF_THRESHOLD, DEFAULT_MATCH_AMBIGUITY_RATIO, DEFAULT_MATCH_CONF_THRESHOLD

class DetectionStatus(str, Enum):
    MATCHED = "matched"      # ✅ Identifié avec certitude (> seuil haut)
    AMBIGUOUS = "ambiguous"  # ⚠️ Plusieurs choix possibles ou score moyen
    UNKNOWN = "unknown"      # ❌ Livre détecté mais titre illisible ou absent du CSV

# --- A. Un candidat potentiel (pour le Top 3) ---
@dataclass
class BookCandidate:
    title: str
    author: str
    db_id: int                      # L'ID unique dans ton CSV/Base de données
    match_score: float              # Score de similitude (0-100)
    editor: Optional[str] = None
    isbn: Optional[str] = None      # Utile pour la certitude absolue

# --- B. La détection d'un livre unique (Le "Livre") ---
@dataclass
class BookDetection:
    # 1. Géométrie & Visuel (Pour l'AR)
    # Liste de 4 points [x, y] pour dessiner le polygone OBB
    box_polygon: List[List[float]]
    
    # 2. Scores techniques (Pour le debug et les seuils)
    yolo_confidence: float          # Est-ce vraiment un livre ?
    ocr_confidence: float           # A-t-on bien lu le texte ?
    
    # 3. Contenu OCR (Ce que la machine a "vu")
    ocr_raw_text: str           # Texte brut (ex: "fdio - Hary P.")
    ocr_cleaned_text: str          # Texte nettoyé (ex: "Harry P")
    ocr_confidence: float

    # 4. Intelligence (Le résultat du matching)
    status: DetectionStatus        # MATCHED, AMBIGUOUS, UNKNOWN
    best_matches: List[BookCandidate]

# --- C. Le Résultat Global de l'Image (L'objet racine) ---
@dataclass
class DetectionResult:
    # La liste des livres trouvés
    detections: List[BookDetection]
    
    # Métadonnées de l'analyse
    session_id: str                 # Lien avec l'utilisateur/session upload
    timestamp: float = time()
    processing_time_ms: float = 0.0       # Pour surveiller la performance (ex: 450ms)
    
    # Résumé rapide (pour les compteurs en haut de l'app)
    total_detected: int = 0
    count_matched: int = 0
    count_ambiguous: int = 0
    count_unknown: int = 0

# --- D. Paramètres d'une détection ---
@dataclass
class DetectionParams:
    yolo_conf_threshold: float = DEFAULT_YOLO_CONF_THRESHOLD
    match_conf_threshold: float = DEFAULT_MATCH_CONF_THRESHOLD
    match_ambiguity_ratio: float = DEFAULT_MATCH_AMBIGUITY_RATIO