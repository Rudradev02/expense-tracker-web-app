from flask import Blueprint, request, jsonify
from utils.auth import token_required
from utils.receipt_parser import parse_receipt_image

receipt_bp = Blueprint("receipt_bp", __name__)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "heic", "heif"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/bmp",
    "image/heic", "image/heif", "application/octet-stream"
}


def is_allowed_file(filename, mimetype):
    """Validate filename extension and content type."""
    ext = (filename.rsplit(".", 1)[1].lower() if "." in filename else "")
    return ext in ALLOWED_EXTENSIONS or mimetype in ALLOWED_MIME_TYPES


@receipt_bp.route("/transactions/scan-receipt", methods=["POST"])
@receipt_bp.route("/scan-receipt", methods=["POST"])
@token_required
def scan_receipt(current_user_id):
    """
    Accepts an uploaded receipt image, performs in-memory OCR extraction,
    and returns predicted transaction fields (merchant, amount, date, category).
    Does NOT store the image on disk or database.
    """
    # 1. Check for file in request
    uploaded_file = None
    for field_name in ["file", "image", "receipt"]:
        if field_name in request.files:
            uploaded_file = request.files[field_name]
            break

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "success": False,
            "error": "No image file provided",
            "friendly_message": "Please select or capture a receipt image to scan.",
            "fallback_to_manual": True
        }), 400

    filename = uploaded_file.filename
    mimetype = uploaded_file.mimetype or ""

    # 2. Validate file type
    if not is_allowed_file(filename, mimetype):
        return jsonify({
            "success": False,
            "error": "Unsupported file format",
            "friendly_message": "Please upload a PNG, JPG, or WEBP image of the receipt.",
            "fallback_to_manual": True
        }), 400

    # 3. Validate file size (max ~5MB)
    uploaded_file.stream.seek(0, 2)  # Seek to end
    file_size = uploaded_file.stream.tell()
    uploaded_file.stream.seek(0)  # Reset stream pointer

    if file_size > MAX_FILE_SIZE:
        return jsonify({
            "success": False,
            "error": "File size exceeds 5MB limit",
            "friendly_message": "Receipt image is too large (max 5MB). Please upload a smaller image.",
            "fallback_to_manual": True
        }), 413

    if file_size == 0:
        return jsonify({
            "success": False,
            "error": "File is empty",
            "friendly_message": "The uploaded image is empty. Please try another photo.",
            "fallback_to_manual": True
        }), 400

    # 4. Perform in-memory OCR and heuristic extraction
    result = parse_receipt_image(uploaded_file)

    if not result.get("success"):
        return jsonify(result), 200

    return jsonify(result), 200
