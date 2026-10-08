import os
import re
import shutil
from datetime import datetime, date
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from utils.category_keywords import CATEGORY_KEYWORD_RULES

# Auto-detect Tesseract binary path
TESSERACT_CANDIDATE_PATHS = [
    os.environ.get("TESSERACT_CMD"),
    shutil.which("tesseract"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\SCP\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
]

TESSERACT_EXECUTABLE = None
for p in TESSERACT_CANDIDATE_PATHS:
    if p and os.path.exists(p):
        TESSERACT_EXECUTABLE = p
        pytesseract.pytesseract.tesseract_cmd = p
        break


def is_tesseract_available():
    """Check if Tesseract binary is accessible on the host."""
    return TESSERACT_EXECUTABLE is not None or shutil.which("tesseract") is not None


def preprocess_image(image):
    """
    Apply grayscale, contrast enhancement, and slight sharpening
    to improve OCR accuracy on thermal paper or noisy phone photos.
    """
    try:
        # Convert to RGB then Grayscale
        gray = image.convert("L")
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.8)
        # Optional gentle filter
        return enhanced
    except Exception:
        return image


def extract_merchant(lines):
    """
    Extract merchant name using header inspection and keyword matching.
    Returns: (merchant_name, confidence)
    """
    ignored_keywords = [
        "tax invoice", "invoice", "receipt", "bill", "cash", "payment",
        "welcome", "thank you", "gst", "gstin", "tel", "phone", "date",
        "time", "order", "table", "cashier", "pos", "token", "subtotal",
        "total", "fssai", "retail", "original", "duplicate", "store #",
        "customer", "copy", "sale"
    ]

    # 1. First inspect the top 5 lines (standard receipt header location for store name)
    header_candidates = []
    for line in lines[:5]:
        cleaned = line.strip()
        if not cleaned or len(cleaned) < 3:
            continue
        lower_line = cleaned.lower()
        if any(ign in lower_line for ign in ignored_keywords):
            continue
        if re.match(r"^[\d\W]+$", cleaned):
            continue
        # Remove leading/trailing symbols
        cleaned = re.sub(r"^[^\w]+|[^\w]+$", "", cleaned).strip()
        if len(cleaned) >= 3:
            header_candidates.append(cleaned)

    if header_candidates:
        best_header = header_candidates[0]
        # Check if a known brand/merchant keyword is in the header line
        header_lower = best_header.lower()
        is_known_brand = False
        for cat, keywords in CATEGORY_KEYWORD_RULES.items():
            for kw in keywords:
                if len(kw) >= 4 and kw.lower() in header_lower:
                    is_known_brand = True
                    break
            if is_known_brand:
                break

        confidence = 0.92 if is_known_brand else (0.80 if len(best_header) >= 4 else 0.60)
        return best_header.title()[:60], confidence

    # 2. Search for recognized merchant brands anywhere in the receipt text (longest keyword first)
    full_text = " ".join(lines).lower()
    matched_kws = []
    for cat, keywords in CATEGORY_KEYWORD_RULES.items():
        for kw in keywords:
            if len(kw) >= 4 and kw.lower() in full_text:
                matched_kws.append(kw)

    if matched_kws:
        matched_kws.sort(key=len, reverse=True)
        return matched_kws[0].title(), 0.85

    return "Receipt Expense", 0.40


def extract_amount(lines):
    """
    Extract total transaction amount from receipt text lines.
    Returns: (amount_float, confidence)
    """
    total_keywords = [
        "grand total", "net total", "total amount", "amount due",
        "net amount", "total", "bill amount", "total inr", "paid amount",
        "card amount", "final total", "balance due"
    ]

    # Regex to capture currency numbers like 1,250.50 or 450.00 or 450
    amount_regex = r"(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)"

    # Priority 1: Lines explicitly containing total keywords
    candidate_totals = []
    for line in lines:
        lower = line.lower()
        if any(kw in lower for kw in total_keywords):
            matches = re.findall(amount_regex, lower)
            for m in matches:
                try:
                    val = float(m.replace(",", ""))
                    if 0.5 <= val <= 2000000:  # reasonable transaction limit
                        candidate_totals.append(val)
                except ValueError:
                    pass

    if candidate_totals:
        # Grand total is typically the largest number among total lines
        return max(candidate_totals), 0.92

    # Priority 2: Look for lines with currency symbols (₹, Rs, INR)
    currency_matches = []
    for line in lines:
        if re.search(r"(?:₹|rs\.?|inr)", line, re.IGNORECASE):
            matches = re.findall(r"(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)", line)
            for m in matches:
                try:
                    val = float(m.replace(",", ""))
                    if 0.5 <= val <= 2000000:
                        currency_matches.append(val)
                except ValueError:
                    pass

    if currency_matches:
        return max(currency_matches), 0.75

    # Priority 3: Fallback - pick the largest reasonable decimal number on the receipt
    fallback_numbers = []
    for line in lines:
        matches = re.findall(r"\b(\d+\.\d{2})\b", line)
        for m in matches:
            try:
                val = float(m)
                if 1.0 <= val <= 500000:
                    fallback_numbers.append(val)
            except ValueError:
                pass

    if fallback_numbers:
        return max(fallback_numbers), 0.50

    return None, 0.0


def extract_date(text):
    """
    Extract date from receipt text and normalize to YYYY-MM-DD.
    Returns: (date_str, confidence)
    """
    today = date.today()

    # Pattern A: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
    date_patterns = [
        # YYYY-MM-DD
        (r"\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b", "%Y-%m-%d"),
        # DD-MM-YYYY or DD/MM/YYYY
        (r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b", "%d-%m-%Y"),
        # DD-MM-YY or DD/MM/YY
        (r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](\d{2})\b", "%d-%m-%y"),
        # DD Mon YYYY (e.g. 15 Oct 2026)
        (r"\b(0[1-9]|[12]\d|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b", "%d %b %Y"),
    ]

    for pattern, fmt in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_str = match.group(0).replace("/", "-").replace(".", "-")
            try:
                dt = datetime.strptime(raw_str, fmt).date()
                # Sanity check: allows up to 30 days ahead (e.g. forward invoice/timezone) and up to 5 years ago
                days_diff = (dt - today).days
                if -1825 <= days_diff <= 30:
                    return dt.strftime("%Y-%m-%d"), 0.90
            except Exception:
                pass

    # Default fallback: today's date with low confidence (so it gets flagged for review)
    return today.strftime("%Y-%m-%d"), 0.40


def parse_receipt_image(file_storage):
    """
    Processes an uploaded image file into extracted transaction fields.
    Does not save the image to disk or database.
    Returns: dictionary with parsed fields, confidence scores, and low_confidence flags.
    """
    # 1. Open image from stream with Pillow
    try:
        image = Image.open(file_storage.stream)
    except Exception as e:
        return {
            "success": False,
            "error": f"Invalid image format: {str(e)}",
            "fallback_to_manual": True
        }

    # 2. Check Tesseract availability
    if not is_tesseract_available():
        return {
            "success": False,
            "error": "Tesseract OCR engine is not installed or configured on the server.",
            "friendly_message": "Tesseract OCR is not installed on this host. You can enter transaction details manually.",
            "tesseract_missing": True,
            "fallback_to_manual": True
        }

    # 3. Preprocess and run OCR
    try:
        processed = preprocess_image(image)
        raw_text = pytesseract.image_to_string(processed, lang="eng")
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR extraction failed: {str(e)}",
            "friendly_message": "Could not extract text from this receipt image. Please enter details manually.",
            "fallback_to_manual": True
        }

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    if not lines or len(raw_text.strip()) < 10:
        return {
            "success": False,
            "error": "No legible text found in image.",
            "friendly_message": "The uploaded image appears blurry or empty. Please enter details manually.",
            "fallback_to_manual": True
        }

    # 4. Extract fields using heuristics
    merchant, merchant_conf = extract_merchant(lines)
    amount, amount_conf = extract_amount(lines)
    tx_date, date_conf = extract_date(raw_text)

    # 5. Extract suggested category from merchant/receipt text
    suggested_category = "General"
    category_conf = 0.50
    full_lower = raw_text.lower()
    for cat, keywords in CATEGORY_KEYWORD_RULES.items():
        for kw in keywords:
            if kw.lower() in full_lower:
                suggested_category = cat
                category_conf = 0.85
                break
        if category_conf > 0.50:
            break

    confidences = {
        "merchant": merchant_conf,
        "amount": amount_conf,
        "date": date_conf,
        "category": category_conf,
    }

    low_confidence_fields = [
        k for k, v in confidences.items() if v < 0.70
    ]

    return {
        "success": True,
        "merchant": merchant,
        "amount": amount,
        "date": tx_date,
        "category": suggested_category,
        "type": "expense",
        "confidences": confidences,
        "low_confidence_fields": low_confidence_fields,
        "raw_text_snippet": raw_text[:300].strip(),
    }
