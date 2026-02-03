from typing import List
from detection import DetectionParams
import pandas as pd
from dataclasses import dataclass

@dataclass
class InventorySession:
    session_id: str
    signatures: List[str]
    df: pd.DataFrame
    last_access: float
    detection_params: DetectionParams
    