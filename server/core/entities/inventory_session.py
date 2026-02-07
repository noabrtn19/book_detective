from typing import List
from core.entities.detection import DetectionParams
import pandas as pd
from dataclasses import dataclass

@dataclass
class InventorySession:
    session_id: str
    signatures: List[str]
    df: pd.DataFrame
    last_access: float
    detection_params: DetectionParams
    