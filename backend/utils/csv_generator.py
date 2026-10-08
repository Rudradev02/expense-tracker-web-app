import csv
import io

def generate_csv(transactions):
    """
    Generate CSV file with UTF-8 BOM so Excel opens Indian Rupee (₹) and other UTF-8 characters properly.
    Columns: date, description, category, type, amount
    """
    output = io.StringIO()
    # Write UTF-8 BOM prefix (\ufeff)
    output.write('\ufeff')
    writer = csv.writer(output)

    # Header columns: date, description, category, type, amount, currency, original_amount
    writer.writerow(["date", "description", "category", "type", "amount", "currency", "original_amount"])

    for t in transactions:
        t_date = t.date.strftime("%Y-%m-%d") if t.date else ""
        t_type = (t.type or "").capitalize()
        t_category = t.category or "General"
        t_amount = f"{t.amount:,.2f}"
        t_curr = getattr(t, "currency", "INR") or "INR"
        orig_val = getattr(t, "original_amount", None)
        t_orig = f"{orig_val:,.2f}" if orig_val is not None else t_amount
        writer.writerow([t_date, t.title or "", t_category, t_type, t_amount, t_curr, t_orig])

    return output.getvalue().encode('utf-8')
