from server.core.config import YOLO_MODEL_PATH, PADDLEOCR_MODEL_PATH
from server.core.detection import detection_pipeline
from ultralytics import YOLO
from paddleocr import PaddleOCR


class DetectionService:

    def __init__(self):
        # 1. Load YOLO model
        self.yolo_model = YOLO(YOLO_MODEL_PATH)

        # 2. Load PaddleOCR model
        self.ocr_engine = PaddleOCR(text_detection_model_dir=PADDLEOCR_MODEL_PATH, use_doc_orientation_classify=True, lang="fr")

    def process_bookshelf(self, *args, **kwargs) -> DetectionResult:
        return detection_pipeline(*args, **kwargs)

