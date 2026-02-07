from pydantic import BaseModel

class DetectionParamsSchema(BaseModel):
    yolo_conf_threshold: float
    match_conf_threshold: float
    match_ambiguity_ratio: float