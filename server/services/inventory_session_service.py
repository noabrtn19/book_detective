import pandas as pd
import time
from typing import Dict, Any
from core.config import TTL_SECONDS
from core.entities.detection import DetectionParams
from core.entities.inventory_session import InventorySession
import pandas as pd

class InventorySessionService:
    def __init__(self):
        self._sessions: Dict[str, InventorySession] = {}
        self.TTL_SECONDS = TTL_SECONDS

    def create_session(self, session_id: str, df: pd.DataFrame, detection_params: DetectionParams):
        """Charge le CSV, prépare les signatures et stocke le tout en RAM."""       
        # Préparation des signatures pour le Fuzzy Matching (Optimisation)
        signatures = (df['author'].astype(str) + " " + df['title'].astype(str)).tolist()

        self._sessions[session_id] = InventorySession(
            session_id=session_id,
            signatures=signatures,
            df=df,
            last_access=time.time(),
            detection_params=detection_params
        )

        print("saved new session with df columns:", list(df.columns.values))
        print(len(df), "rows")
        print("session_id:", session_id)
        print("detection_params:", detection_params)

    def get_session_data(self, session_id: str):
        """Récupère les données d'un utilisateur et met à jour son temps d'accès."""
        if session_id not in self._sessions:
            return None
        
        self._sessions[session_id].last_access = time.time()
        return self._sessions[session_id]

    def cleanup_inactive_sessions(self):
        """Supprime les sessions trop vieilles pour libérer la RAM."""
        now = time.time()
        expired_sessions = [
            sid for sid, data in self._sessions.items() 
            if (now - data.last_access) > self.TTL_SECONDS
        ]
        
        for sid in expired_sessions:
            del self._sessions[sid]
            print(f"Nettoyage : Session {sid} expirée et supprimée.")