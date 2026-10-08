import io
from datetime import datetime

def escape_pdf_text(s):
    """
    Sanitize text for standard PDF Type 1 fonts (WinAnsiEncoding).
    Replaces unicode symbols like ₹ with Rs. and escapes PDF parentheses.
    """
    if s is None:
        return ""
    s = str(s)
    # Currency and common unicode replacements
    s = s.replace("\u20b9", "Rs. ")  # Indian Rupee
    s = s.replace("\u2013", "-").replace("\u2014", "-")  # en/em dashes
    s = s.replace("\u2018", "'").replace("\u2019", "'")  # curly quotes
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2022", "*")

    cleaned = []
    for ch in s:
        code = ord(ch)
        if 32 <= code <= 126:
            if ch in ('\\', '(', ')'):
                cleaned.append('\\' + ch)
            else:
                cleaned.append(ch)
        elif code in (10, 13):
            cleaned.append(' ')
        else:
            cleaned.append(' ')
    return "".join(cleaned)


class PDFStreamBuilder:
    """Helper to construct PDF graphics and text streams."""
    def __init__(self):
        self.commands = []

    def set_fill_rgb(self, r, g, b):
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg\n")

    def set_stroke_rgb(self, r, g, b):
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} RG\n")

    def rect(self, x, y, w, h, fill=True, stroke=False):
        op = "B" if (fill and stroke) else ("f" if fill else "S")
        self.commands.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {op}\n")

    def line(self, x1, y1, x2, y2, width=1.0):
        self.commands.append(f"{width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S\n")

    def text(self, x, y, content, font="F1", size=10, fill_rgb=(0.1, 0.1, 0.1), align="left", max_chars=None):
        if not content:
            return
        escaped = escape_pdf_text(content)
        if max_chars and len(escaped) > max_chars:
            escaped = escaped[:max_chars - 3] + "..."

        # Calculate estimated text width for alignment
        # Standard Helvetica approx 0.52 * size pt per char
        char_factor = 0.52 if font != "F2" else 0.56
        estimated_w = len(escaped) * (size * char_factor)
        draw_x = x
        if align == "right":
            draw_x = x - estimated_w
        elif align == "center":
            draw_x = x - (estimated_w / 2.0)

        r, g, b = fill_rgb
        self.commands.append(
            f"q {r:.3f} {g:.3f} {b:.3f} rg BT /{font} {size} Tf {draw_x:.2f} {y:.2f} Td ({escaped}) Tj ET Q\n"
        )

    def to_bytes(self):
        return "".join(self.commands).encode("latin-1", "replace")


def generate_pdf(transactions, filters=None):
    """
    Generate clean, multi-page PDF statement matching Obsidian & Champagne theme.
    Zero external dependencies (uses standard PDF 1.4 specification).
    Includes:
      - Title, Date range / period, Generation timestamp
      - Executive summary totals for Income, Expense, Net Balance
      - Multi-page table with clean row stripes, status/type indicators, and page numbers
    """
    filters = filters or {}
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")
    period_str = (
        f"{start_date} to {end_date}" if (start_date and end_date)
        else (f"From {start_date}" if start_date
        else (f"Up to {end_date}" if end_date else "All Dates"))
    )
    gen_time_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Financial totals
    total_income = sum(t.amount for t in transactions if (t.type or "").lower() == "income")
    total_expense = sum(t.amount for t in transactions if (t.type or "").lower() == "expense")
    net_balance = total_income - total_expense

    # Layout constants (A4 is 595.28 x 841.89)
    page_w = 595.28
    page_h = 841.89
    margin_x = 40.0
    printable_w = page_w - (2 * margin_x)  # 515.28 pt

    # Rows per page configuration
    PAGE_1_ROWS = 22
    SUBSEQUENT_ROWS = 32

    # Partition transactions into pages
    pages_txs = []
    if len(transactions) <= PAGE_1_ROWS:
        pages_txs.append(transactions)
    else:
        pages_txs.append(transactions[:PAGE_1_ROWS])
        remaining = transactions[PAGE_1_ROWS:]
        while remaining:
            pages_txs.append(remaining[:SUBSEQUENT_ROWS])
            remaining = remaining[SUBSEQUENT_ROWS:]

    total_pages = len(pages_txs)
    page_streams = []

    # Theme colors
    C_OBSIDIAN = (0.08, 0.08, 0.09)     # #141416
    C_ACCENT = (0.79, 0.66, 0.42)       # Champagne #C9A86A
    C_SURFACE_LIGHT = (0.97, 0.97, 0.96)# Faint warm white
    C_BORDER = (0.87, 0.86, 0.84)       # Border tone
    C_TEXT_DARK = (0.11, 0.11, 0.12)    # Dark charcoal
    C_TEXT_MUTED = (0.43, 0.43, 0.41)   # Muted slate/brown
    C_INCOME = (0.12, 0.51, 0.30)       # Deep emerald
    C_EXPENSE = (0.70, 0.22, 0.15)      # Deep crimson

    # Generate each page stream
    for page_idx, page_items in enumerate(pages_txs, start=1):
        sb = PDFStreamBuilder()

        # ── 1. Page Header ──
        if page_idx == 1:
            # Main Banner
            sb.set_fill_rgb(*C_OBSIDIAN)
            sb.rect(margin_x, page_h - 105, printable_w, 65, fill=True, stroke=False)

            # Champagne Accent Vertical Line
            sb.set_fill_rgb(*C_ACCENT)
            sb.rect(margin_x + 16, page_h - 93, 3.5, 41, fill=True, stroke=False)

            # Title
            sb.text(margin_x + 28, page_h - 68, "EXPENSE TRACKER", font="F2", size=13, fill_rgb=(0.96, 0.95, 0.92))
            sb.text(margin_x + 28, page_h - 85, "STATEMENT OF TRANSACTIONS", font="F1", size=8.5, fill_rgb=C_ACCENT)

            # Right Header Info
            right_x = margin_x + printable_w - 16
            sb.text(right_x, page_h - 68, f"Period: {period_str}", font="F1", size=8.5, fill_rgb=(0.9, 0.9, 0.9), align="right")
            sb.text(right_x, page_h - 84, f"Generated: {gen_time_str}", font="F1", size=7.5, fill_rgb=(0.65, 0.65, 0.65), align="right")

            # ── 2. KPI Summary Cards ──
            card_y = page_h - 172
            card_h = 52
            gap = 12
            card_w = (printable_w - (2 * gap)) / 3

            cards_data = [
                ("TOTAL INCOME", f"+Rs. {total_income:,.2f}", C_INCOME),
                ("TOTAL EXPENSES", f"-Rs. {total_expense:,.2f}", C_EXPENSE),
                ("NET BALANCE", f"Rs. {net_balance:,.2f}", C_TEXT_DARK),
            ]

            for i, (label, val_str, val_col) in enumerate(cards_data):
                cx = margin_x + i * (card_w + gap)
                # Card Background & Border
                sb.set_fill_rgb(*C_SURFACE_LIGHT)
                sb.set_stroke_rgb(*C_BORDER)
                sb.rect(cx, card_y, card_w, card_h, fill=True, stroke=True)

                # Colored Top Accent Strip
                strip_col = C_INCOME if i == 0 else (C_EXPENSE if i == 1 else C_ACCENT)
                sb.set_fill_rgb(*strip_col)
                sb.rect(cx, card_y + card_h - 2.5, card_w, 2.5, fill=True, stroke=False)

                # Label & Value
                sb.text(cx + 12, card_y + 32, label, font="F2", size=7.5, fill_rgb=C_TEXT_MUTED)
                sb.text(cx + 12, card_y + 14, val_str, font="F2", size=11, fill_rgb=val_col)

            table_top_y = card_y - 20

        else:
            # Compact Top Running Header for Subsequent Pages
            sb.set_fill_rgb(*C_OBSIDIAN)
            sb.rect(margin_x, page_h - 65, printable_w, 32, fill=True, stroke=False)

            sb.set_fill_rgb(*C_ACCENT)
            sb.rect(margin_x + 12, page_h - 59, 2.5, 20, fill=True, stroke=False)

            sb.text(margin_x + 22, page_h - 50, "EXPENSE TRACKER - STATEMENT (CONTINUED)", font="F2", size=8.5, fill_rgb=(0.95, 0.95, 0.92))
            right_x = margin_x + printable_w - 12
            sb.text(right_x, page_h - 50, f"Period: {period_str}", font="F1", size=8, fill_rgb=(0.7, 0.7, 0.7), align="right")

            table_top_y = page_h - 85

        # ── 3. Table Column Header ──
        th_h = 22
        sb.set_fill_rgb(*C_OBSIDIAN)
        sb.rect(margin_x, table_top_y - th_h, printable_w, th_h, fill=True, stroke=False)

        # Column widths & X positions:
        # Date: 70, Description: 185, Category: 105, Type: 55, Amount: 100
        col_date_x = margin_x + 8
        col_desc_x = margin_x + 75
        col_cat_x = margin_x + 265
        col_type_x = margin_x + 375
        col_amt_x = margin_x + printable_w - 10

        th_y = table_top_y - 15
        sb.text(col_date_x, th_y, "DATE", font="F2", size=7.5, fill_rgb=(1, 1, 1))
        sb.text(col_desc_x, th_y, "DESCRIPTION", font="F2", size=7.5, fill_rgb=(1, 1, 1))
        sb.text(col_cat_x, th_y, "CATEGORY", font="F2", size=7.5, fill_rgb=(1, 1, 1))
        sb.text(col_type_x, th_y, "TYPE", font="F2", size=7.5, fill_rgb=(1, 1, 1))
        sb.text(col_amt_x, th_y, "AMOUNT", font="F2", size=7.5, fill_rgb=(1, 1, 1), align="right")

        # ── 4. Table Rows ──
        row_y = table_top_y - th_h
        row_h = 19

        if not page_items:
            # Empty state
            empty_h = 60
            sb.set_fill_rgb(*C_SURFACE_LIGHT)
            sb.set_stroke_rgb(*C_BORDER)
            sb.rect(margin_x, row_y - empty_h, printable_w, empty_h, fill=True, stroke=True)
            sb.text(
                margin_x + (printable_w / 2),
                row_y - 35,
                "No transactions found matching the selected criteria.",
                font="F1",
                size=9,
                fill_rgb=C_TEXT_MUTED,
                align="center"
            )
        else:
            for r_idx, t in enumerate(page_items):
                current_y = row_y - (r_idx + 1) * row_h
                # Alternating row background
                if r_idx % 2 == 1:
                    sb.set_fill_rgb(0.985, 0.985, 0.98)
                    sb.rect(margin_x, current_y, printable_w, row_h, fill=True, stroke=False)

                # Thin bottom separator line
                sb.set_stroke_rgb(0.91, 0.90, 0.88)
                sb.line(margin_x, current_y, margin_x + printable_w, current_y, width=0.5)

                # Data mapping
                t_date = t.date.strftime("%Y-%m-%d") if t.date else "-"
                t_desc = t.title or "Untitled"
                t_cat = t.category or "General"
                t_type = (t.type or "Expense").capitalize()
                is_income = t_type.lower() == "income"

                text_y = current_y + 6
                sb.text(col_date_x, text_y, t_date, font="F1", size=8, fill_rgb=C_TEXT_MUTED)
                sb.text(col_desc_x, text_y, t_desc, font="F1", size=8, fill_rgb=C_TEXT_DARK, max_chars=34)
                sb.text(col_cat_x, text_y, t_cat, font="F1", size=8, fill_rgb=C_TEXT_MUTED, max_chars=18)

                # Type
                type_color = C_INCOME if is_income else C_EXPENSE
                sb.text(col_type_x, text_y, t_type, font="F2", size=7.5, fill_rgb=type_color)

                # Amount (Right Aligned)
                amt_str = f"{'+' if is_income else '-'}Rs. {t.amount:,.2f}"
                sb.text(col_amt_x, text_y, amt_str, font="F2", size=8.5, fill_rgb=type_color, align="right")

        # ── 5. Page Footer ──
        footer_line_y = 38
        sb.set_stroke_rgb(*C_BORDER)
        sb.line(margin_x, footer_line_y, margin_x + printable_w, footer_line_y, width=0.5)

        footer_text_y = 26
        sb.text(
            margin_x,
            footer_text_y,
            "Private & Confidential - Personal Expense Tracker",
            font="F3",
            size=7.5,
            fill_rgb=C_TEXT_MUTED
        )
        sb.text(
            margin_x + printable_w,
            footer_text_y,
            f"Page {page_idx} of {total_pages}",
            font="F1",
            size=7.5,
            fill_rgb=C_TEXT_MUTED,
            align="right"
        )

        page_streams.append(sb.to_bytes())

    # ── 6. Assemble Final Standard PDF 1.4 Binary ──
    # Objects layout:
    # 1: Catalog
    # 2: Pages
    # 3: Font F1 (Helvetica)
    # 4: Font F2 (Helvetica-Bold)
    # 5: Font F3 (Helvetica-Oblique)
    # For each page i (0-indexed):
    #   Page Object ID: 6 + 2*i
    #   Content Stream Object ID: 6 + 2*i + 1

    objects = []

    # Obj 1: Catalog
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

    # Obj 2: Pages
    kids_refs = " ".join([f"{6 + 2*i} 0 R" for i in range(total_pages)])
    objects.append(
        f"2 0 obj\n<< /Type /Pages /Kids [{kids_refs}] /Count {total_pages} >>\nendobj\n".encode("ascii")
    )

    # Obj 3, 4, 5: Standard Type 1 Fonts
    objects.append(
        b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
    )
    objects.append(
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"
    )
    objects.append(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n"
    )

    # Page objects and content streams
    for i in range(total_pages):
        page_obj_id = 6 + 2 * i
        content_obj_id = page_obj_id + 1
        stream_bytes = page_streams[i]

        page_dict = (
            f"{page_obj_id} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_w:.2f} {page_h:.2f}] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> "
            f"/Contents {content_obj_id} 0 R >>\nendobj\n"
        ).encode("ascii")
        objects.append(page_dict)

        content_dict = (
            f"{content_obj_id} 0 obj\n"
            f"<< /Length {len(stream_bytes)} >>\nstream\n"
        ).encode("ascii") + stream_bytes + b"\nendstream\nendobj\n"
        objects.append(content_dict)

    # Compile byte buffer and xref table
    output = bytearray()
    output.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = [0]
    for obj in objects:
        offsets.append(len(output))
        output.extend(obj)

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \r\n")
    for off in offsets[1:]:
        output.extend(f"{off:010d} 00000 n \r\n".encode("ascii"))

    trailer = (
        f"trailer\n"
        f"<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n"
        f"{xref_offset}\n"
        f"%%EOF\n"
    ).encode("ascii")
    output.extend(trailer)

    return bytes(output)
