"""
Category keyword rules configuration.
Easily add, remove, or modify keyword mappings for auto-categorization.
Keywords are matched case-insensitively against transaction titles/descriptions.
"""

CATEGORY_KEYWORD_RULES = {
    "Food": [
        "swiggy", "zomato", "restaurant", "cafe", "coffee", "starbucks",
        "mcdonald", "burger", "pizza", "domino", "dine", "dinner", "lunch",
        "breakfast", "groceries", "grocery", "supermarket", "blinkit", "zepto",
        "instamart", "bigbasket", "subway", "kfc", "bakery", "tea", "chai",
        "dunkin", "haldiram", "biryani", "food", "eat", "dining", "barbeque",
        "sweets", "kitchen", "canteen", "bistro", "tiffin"
    ],
    "Transport": [
        "uber", "ola", "metro", "auto", "cab", "taxi", "rapido", "petrol",
        "fuel", "diesel", "gas station", "parking", "toll", "fastag", "flight",
        "airline", "indigo", "air india", "train", "irctc", "bus", "redbus",
        "commute", "transit", "subway token", "railway", "chauffeur"
    ],
    "Entertainment": [
        "netflix", "spotify", "prime", "hotstar", "disney", "youtube", "cinema",
        "movie", "pvr", "inox", "bookmyshow", "steam", "playstation", "xbox",
        "game", "gaming", "concert", "theatre", "music", "hulu", "apple tv",
        "audible", "nintendo", "amusement", "bowling", "carnival"
    ],
    "Bills": [
        "electricity", "power", "water", "gas", "cylinder", "recharge", "airtel",
        "jio", "vi", "vodafone", "broadband", "wifi", "internet", "dth",
        "maintenance", "utility", "postpaid", "prepaid", "bill", "rent",
        "landlord", "tneb", "bescom", "tata play", "piped gas", "housing society"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "zara", "h&m", "nike", "adidas",
        "mall", "clothing", "shoes", "electronics", "croma", "reliance digital",
        "apple store", "meesho", "nykaa", "apparel", "uniqlo", "decathlon",
        "lifestyle", "shoppers stop", "westside", "retail", "store", "gadget"
    ],
    "Salary": [
        "salary", "payroll", "stipend", "bonus", "dividend", "interest",
        "freelance", "client payment", "consulting fee", "honorarium", "wages",
        "compensation", "direct deposit", "earnings", "retainer"
    ],
    "Health": [
        "pharmacy", "medicine", "apollo", "1mg", "pharmeasy", "doctor", "clinic",
        "hospital", "dentist", "medical", "gym", "cult", "fitness", "yoga",
        "pathology", "diagnostic", "therapist", "optician", "lenskart", "meds"
    ],
}
