import numpy as np
import re
from rapidfuzz import process, fuzz
import cv2
from schema import BookCandidate
import pandas as pd
from typing import Iterable

def get_warped_crop(img, points):
    rect = np.zeros((4, 2), dtype="float32")
    s = points.sum(axis=1)
    rect[0] = points[np.argmin(s)]
    rect[2] = points[np.argmax(s)]
    diff = np.diff(points, axis=1)
    rect[1] = points[np.argmin(diff)]
    rect[3] = points[np.argmax(diff)]
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
    if maxWidth > maxHeight:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
    return warped

def clean_ocr_text(text):
    if not text: return ""

    # A. Liste noire des erreurs OCR récurrentes pour "Folio" et autres logos
    # On utilise des expressions régulières pour ne matcher que des mots entiers ou presque
    garbage_patterns = [
        r'\bdio\b', r'\bfdio\b', r'\bolio\b', r'\b6ho\b', r'\bBo\b', r'\bdo\b', r'\bOP\b', # Variantes Folio
        r'\bfolio\b', # Le mot folio lui-même (souvent inutile pour le titre)
        r'\d+\.\d+',  # Prix (ex: 12.96)
        r'\b\d{4,}\b' # Séries de chiffres longues (codes barres, ex: 30875)
    ]

    cleaned = text
    for pattern in garbage_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    # B. Nettoyage des caractères spéciaux isolés (garder les lettres, accents et espaces)
    # On enlève les tirets isolés qui viennent du join(" - ")
    cleaned = cleaned.replace('-', ' ')

    # C. Supprimer les caractères uniques parasites (ex: "i - Alejo")
    # On supprime les mots de 1 lettre sauf 'a', 'y', 'à' (pour éviter de casser "il y a")
    cleaned = ' '.join([w for w in cleaned.split() if len(w) > 1 or w.lower() in ['a', 'y', 'à', 'l', 'd']])

    # D. Espaces multiples
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    return cleaned

def find_top_matches(ocr_text, signatures: Iterable[str], df: pd.DataFrame, limit=3):
    """
    Compare le texte OCR avec la base de données et renvoie les 'limit' meilleurs résultats.
    
    Retourne une liste de tuples : [(texte_matché, score, index_db), ...]
    Exemple : [('Harry Potter 1', 95.0, 10), ('Harry Potter 2', 88.5, 12), ...]
    """
    if not ocr_text or len(ocr_text) < 3:
        return []

    # process.extract renvoie une liste triée des meilleurs matchs
    # exemple : [('Harry Potter 1', 95.0, 10), ('Harry Potter 2', 88.5, 12), ...]
    matches = process.extract(
        ocr_text, 
        signatures, 
        scorer=fuzz.token_set_ratio, 
        limit=limit
    )

    results = []
    for _, score, idx in matches:
        match = df.iloc[idx]
        results.append(
            BookCandidate(
                title=match["title"],
                author=match["author"],
                editor=match["editor"],
                isbn=match["isbn"],
                db_id=idx,
                match_score=score
            )
        )
    
    return results