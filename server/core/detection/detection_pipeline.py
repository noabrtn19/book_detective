import cv2
import pandas as pd
from server.services.utils import get_warped_crop, clean_ocr_text, find_top_matches
from time import time
from typing import Iterable, Any
from statistics import mean
from server.core.entities.exceptions import ImageNotFoundException, EmptyImageException


def process_bookshelf(image_path:str,
                      session_id: str,
                      signatures: Iterable[str],
                      df: pd.DataFrame,
                      detection_params: dict[str, Any]):
    starting_time = time()

    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ImageNotFoundException("Image path is incorrect")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Book segmentation
    yolo_results = yolo_model.predict(image_path, conf=detection_params.yolo_conf_threshold, verbose=False)[0]
    if yolo_results.obb is None:
        raise EmptyImageException("Image is empty")
    obb_points = yolo_results.obb.xyxyxyxy.cpu().numpy()
    confidences = yolo_results.obb.conf.cpu().numpy()

    detection_result = DetectionResult()
    detection_result.total_detected = len(obb_points)
    detection_result.session_id = session_id
    
    # For each book
    for points, confidence in zip(obb_points, confidences):
        detection = BookDetection()
        detection.box_polygon = points.tolist()
        detection.yolo_confidence = confidence
        
        # Crop & rotate
        crop = get_warped_crop(img, points)
        crop = cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE)

        # Perform OCR
        ocr_result = ocr_engine.predict(crop)[0]
        text = " - ".join(ocr_result["rec_texts"])
        detection.ocr_raw_text = text
        detection.ocr_confidence = mean(ocr_result["rec_scores"])
        del ocr_result

        # Clean
        text = clean_ocr_text(text)
        detection.ocr_cleaned_text = text

        # Top 3 Matching
        matches = find_top_matches(text, signatures, df, limit=3)

        # Decision
        if matches[0].match_score >= detection_params.match_conf_threshold:
            if matches[0].match_score / matches[1].match_score >= detection.params.match_ambiguity_ratio:
                detection.status = DetectionStatus.MATCHED
                detection.best_matches = [matches[0]]
                detection_result.count_matched += 1
            else:
                detection.status = DetectionStatus.AMBIGUOUS
                detection.best_matches = matches
                detection_result.count_ambiguous += 1
        else:
            detection.status = DetectionStatus.UNKNOWN
            detection.best_matches = matches
            detection_result.count_unknown += 1

        detection_result.detections.append(detection)

        ending_time = time()
        detection_result.processing_time_ms = (ending_time - starting_time) * 1_000

    return detection_result